-- Add conflict check to book_class_with_points function
-- This ensures points bookings cannot conflict with monthly recurring bookings

CREATE OR REPLACE FUNCTION book_class_with_points(
    p_user_id UUID,
    p_coach_id UUID,
    p_session_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_day_of_week INTEGER,
    p_points_used INTEGER,
    p_meeting_link TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_current_total_used INTEGER;
    v_new_balance INTEGER;
    v_new_total_used INTEGER;
    v_booking_id UUID;
    v_transaction_id UUID;
    v_is_available BOOLEAN;
    v_conflict_check RECORD;
BEGIN
    -- Check for scheduling conflicts first
    SELECT * INTO v_conflict_check FROM check_points_booking_availability(
        p_coach_id,
        p_session_date,
        p_start_time,
        p_end_time
    );
    
    IF NOT v_conflict_check.available THEN
        RAISE EXCEPTION 'Time slot not available: %', v_conflict_check.conflict_details;
    END IF;
    
    -- Lock the user_points row for this user to prevent race conditions
    SELECT balance, total_used 
    INTO v_current_balance, v_current_total_used
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- If no user_points record exists, raise error
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'No points balance found for user';
    END IF;
    
    -- Check if user has enough points
    IF v_current_balance < p_points_used THEN
        RAISE EXCEPTION 'Insufficient points: have %, need %', v_current_balance, p_points_used;
    END IF;
    
    -- Calculate new values
    v_new_balance := v_current_balance - p_points_used;
    v_new_total_used := COALESCE(v_current_total_used, 0) + p_points_used;
    
    -- 1. Update user_points (deduct balance, increment total_used)
    UPDATE user_points
    SET 
        balance = v_new_balance,
        total_used = v_new_total_used,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 2. Create the flexible booking
    INSERT INTO flexible_bookings (
        user_id,
        coach_id,
        session_date,
        start_time,
        end_time,
        day_of_week,
        points_used,
        status,
        meeting_link,
        created_at
    ) VALUES (
        p_user_id,
        p_coach_id,
        p_session_date,
        p_start_time,
        p_end_time,
        p_day_of_week,
        p_points_used,
        'confirmed',
        p_meeting_link,
        NOW()
    )
    RETURNING id INTO v_booking_id;
    
    -- 3. Create transaction record
    INSERT INTO point_transactions (
        user_id,
        type,
        amount,
        balance_after,
        booking_id,
        description,
        status,
        created_at
    ) VALUES (
        p_user_id,
        'usage',
        -p_points_used,
        v_new_balance,
        v_booking_id,
        'Booked class with coach ' || p_coach_id,
        'completed',
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    -- Return booking details
    RETURN jsonb_build_object(
        'booking_id', v_booking_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_new_balance,
        'total_used', v_new_total_used,
        'points_used', p_points_used
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION book_class_with_points(UUID, UUID, DATE, TIME, TIME, INTEGER, INTEGER, TEXT) TO authenticated;

-- Add comment explaining the conflict check
COMMENT ON FUNCTION book_class_with_points IS 
'Creates a points-based booking with automatic conflict checking.
Checks for conflicts with: monthly recurring bookings, other points bookings, special bookings, and blocked dates.
Raises exception if slot is not available or if user has insufficient points.';
