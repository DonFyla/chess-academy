-- Fix points tracking with atomic function
-- This function handles all point deduction logic in a single transaction

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
BEGIN
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

-- Also fix the cancel/refund function to be atomic
CREATE OR REPLACE FUNCTION cancel_booking_and_refund(
    p_booking_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_current_balance INTEGER;
    v_current_total_used INTEGER;
    v_new_balance INTEGER;
    v_refund_amount INTEGER;
    v_hours_until NUMERIC;
BEGIN
    -- Lock and get booking details
    SELECT * INTO v_booking
    FROM flexible_bookings
    WHERE id = p_booking_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    IF v_booking.status = 'cancelled' THEN
        RAISE EXCEPTION 'Booking already cancelled';
    END IF;
    
    -- Check 24 hour rule
    v_hours_until := EXTRACT(EPOCH FROM (v_booking.session_date + v_booking.start_time - NOW())) / 3600;
    
    IF v_hours_until < 24 THEN
        RAISE EXCEPTION 'Cannot cancel less than 24 hours before session';
    END IF;
    
    v_refund_amount := v_booking.points_used;
    
    -- Lock user_points row
    SELECT balance, total_used INTO v_current_balance, v_current_total_used
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    v_new_balance := v_current_balance + v_refund_amount;
    
    -- 1. Update booking status
    UPDATE flexible_bookings
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        refund_processed = true
    WHERE id = p_booking_id;
    
    -- 2. Refund points (add back to balance)
    UPDATE user_points
    SET 
        balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Note: We don't subtract from total_used because those points were actually used
    -- The refund just gives them back balance, but total_used stays as historical record
    
    -- 3. Create refund transaction
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
        'refund',
        v_refund_amount,
        v_new_balance,
        p_booking_id,
        'Refund for cancelled booking',
        'completed',
        NOW()
    );
    
    RETURN jsonb_build_object(
        'booking_id', p_booking_id,
        'refund_amount', v_refund_amount,
        'new_balance', v_new_balance,
        'total_used', v_current_total_used  -- unchanged
    );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_booking_and_refund(UUID, UUID) TO authenticated;
