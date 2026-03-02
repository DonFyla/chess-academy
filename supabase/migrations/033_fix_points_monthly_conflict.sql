-- Fix conflict detection between monthly bookings and points bookings
-- This migration ensures that monthly recurring bookings properly block points bookings

-- First, let's verify the is_slot_available function is working correctly
-- The function should check all booking types including monthly recurring bookings

-- Drop and recreate the is_slot_available function with clearer logic
CREATE OR REPLACE FUNCTION is_slot_available(
    p_coach_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_conflict BOOLEAN := FALSE;
    v_day_of_week INTEGER;
BEGIN
    -- Get day of week for the date (0=Sunday, 1=Monday, etc.)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check 1: Monthly recurring bookings
    -- A monthly booking blocks a slot if:
    -- 1. It's for the same coach
    -- 2. Status is not rejected/cancelled
    -- 3. The day of week matches the recurring_days
    -- 4. Time overlaps
    SELECT EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.coach_id = p_coach_id
          AND b.status NOT IN ('rejected', 'cancelled')
          AND v_day_of_week = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
          AND b.start_time < p_end_time
          AND b.end_time > p_start_time
    ) INTO v_has_conflict;
    
    IF v_has_conflict THEN
        RETURN FALSE;
    END IF;
    
    -- Check 2: Point-based flexible bookings
    SELECT EXISTS (
        SELECT 1 
        FROM flexible_bookings fb
        WHERE fb.coach_id = p_coach_id
          AND fb.session_date = p_date
          AND fb.status IN ('confirmed', 'completed')
          AND fb.start_time < p_end_time
          AND fb.end_time > p_start_time
    ) INTO v_has_conflict;
    
    IF v_has_conflict THEN
        RETURN FALSE;
    END IF;
    
    -- Check 3: Special bookings
    SELECT EXISTS (
        SELECT 1 
        FROM special_bookings sb
        WHERE sb.coach_id = p_coach_id
          AND sb.status IN ('confirmed', 'payment_received')
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(sb.session_dates) AS session
              WHERE (session->>'date')::DATE = p_date
                AND (session->>'start_time')::TIME < p_end_time
                AND (session->>'end_time')::TIME > p_start_time
          )
    ) INTO v_has_conflict;
    
    IF v_has_conflict THEN
        RETURN FALSE;
    END IF;
    
    -- Check 4: Coach blocked dates
    SELECT EXISTS (
        SELECT 1 
        FROM coach_blocked_dates cbd
        WHERE cbd.coach_id = p_coach_id
          AND cbd.blocked_date = p_date
          AND (
              (cbd.start_time IS NULL AND cbd.end_time IS NULL)
              OR
              (cbd.start_time < p_end_time AND cbd.end_time > p_start_time)
          )
    ) INTO v_has_conflict;
    
    IF v_has_conflict THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_slot_available(UUID, DATE, TIME, TIME) TO anon;
GRANT EXECUTE ON FUNCTION is_slot_available(UUID, DATE, TIME, TIME) TO authenticated;

-- Create a function specifically for checking points booking availability
-- This function expands monthly recurring bookings into individual dates for easier checking
CREATE OR REPLACE FUNCTION check_points_booking_availability(
    p_coach_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS TABLE (
    available BOOLEAN,
    conflict_type TEXT,
    conflict_details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available BOOLEAN := TRUE;
    v_conflict_type TEXT := NULL;
    v_conflict_details TEXT := NULL;
    v_day_of_week INTEGER;
    v_monthly_booking RECORD;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check monthly recurring bookings
    SELECT b.id, b.student_name, b.start_time, b.end_time
    INTO v_monthly_booking
    FROM bookings b
    WHERE b.coach_id = p_coach_id
      AND b.status NOT IN ('rejected', 'cancelled')
      AND v_day_of_week = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time
    LIMIT 1;
    
    IF FOUND THEN
        v_available := FALSE;
        v_conflict_type := 'monthly_booking';
        v_conflict_details := format('Booked by %s from %s to %s', 
            v_monthly_booking.student_name,
            v_monthly_booking.start_time::TEXT,
            v_monthly_booking.end_time::TEXT
        );
        RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
        RETURN;
    END IF;
    
    -- Check flexible bookings
    IF EXISTS (
        SELECT 1 
        FROM flexible_bookings fb
        WHERE fb.coach_id = p_coach_id
          AND fb.session_date = p_date
          AND fb.status IN ('confirmed', 'completed')
          AND fb.start_time < p_end_time
          AND fb.end_time > p_start_time
    ) THEN
        v_available := FALSE;
        v_conflict_type := 'flexible_booking';
        v_conflict_details := 'Time slot already booked with points';
        RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
        RETURN;
    END IF;
    
    -- Check special bookings
    IF EXISTS (
        SELECT 1 
        FROM special_bookings sb
        WHERE sb.coach_id = p_coach_id
          AND sb.status IN ('confirmed', 'payment_received')
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(sb.session_dates) AS session
              WHERE (session->>'date')::DATE = p_date
                AND (session->>'start_time')::TIME < p_end_time
                AND (session->>'end_time')::TIME > p_start_time
          )
    ) THEN
        v_available := FALSE;
        v_conflict_type := 'special_booking';
        v_conflict_details := 'Time slot booked for special coaching';
        RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
        RETURN;
    END IF;
    
    -- Check blocked dates
    IF EXISTS (
        SELECT 1 
        FROM coach_blocked_dates cbd
        WHERE cbd.coach_id = p_coach_id
          AND cbd.blocked_date = p_date
          AND (
              (cbd.start_time IS NULL AND cbd.end_time IS NULL)
              OR
              (cbd.start_time < p_end_time AND cbd.end_time > p_start_time)
          )
    ) THEN
        v_available := FALSE;
        v_conflict_type := 'blocked';
        v_conflict_details := 'Time slot blocked by coach';
        RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
        RETURN;
    END IF;
    
    -- If we get here, the slot is available
    RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
END;
$$;

GRANT EXECUTE ON FUNCTION check_points_booking_availability(UUID, DATE, TIME, TIME) TO anon;
GRANT EXECUTE ON FUNCTION check_points_booking_availability(UUID, DATE, TIME, TIME) TO authenticated;

-- Update the get_coach_unified_schedule function to ensure proper data types
CREATE OR REPLACE FUNCTION get_coach_unified_schedule(
    p_coach_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_days_ahead INTEGER DEFAULT 90
)
RETURNS TABLE (
    booking_id UUID,
    booking_type TEXT,
    session_date DATE,
    start_time TIME,
    end_time TIME,
    student_name TEXT,
    student_email TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_end_date DATE;
BEGIN
    v_end_date := p_start_date + p_days_ahead;
    
    RETURN QUERY
    
    -- Monthly recurring bookings
    SELECT 
        b.id,
        'monthly'::TEXT as booking_type,
        d.date_val::DATE as session_date,
        b.start_time::TIME as start_time,
        b.end_time::TIME as end_time,
        b.student_name,
        b.student_email,
        b.status
    FROM bookings b
    CROSS JOIN LATERAL (
        SELECT generate_series(
            GREATEST(b.booking_date, p_start_date),
            LEAST(b.booking_date + INTERVAL '30 days', v_end_date),
            INTERVAL '7 days'
        )::DATE AS date_val
    ) d
    WHERE b.coach_id = p_coach_id
      AND b.status NOT IN ('rejected', 'cancelled')
      AND EXTRACT(DOW FROM d.date_val) = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
      AND d.date_val BETWEEN p_start_date AND v_end_date
    
    UNION ALL
    
    -- Point-based flexible bookings
    SELECT 
        fb.id,
        'points'::TEXT as booking_type,
        fb.session_date,
        fb.start_time,
        fb.end_time,
        COALESCE(u.email, 'Unknown'),
        u.email,
        fb.status
    FROM flexible_bookings fb
    LEFT JOIN LATERAL (
        SELECT email FROM auth.users WHERE id = fb.user_id
    ) u ON true
    WHERE fb.coach_id = p_coach_id
      AND fb.status IN ('confirmed', 'completed')
      AND fb.session_date BETWEEN p_start_date AND v_end_date
    
    UNION ALL
    
    -- Special bookings
    SELECT 
        sb.id,
        'special'::TEXT as booking_type,
        (session->>'date')::DATE as session_date,
        (session->>'start_time')::TIME as start_time,
        (session->>'end_time')::TIME as end_time,
        sb.student_name,
        sb.student_email,
        sb.status
    FROM special_bookings sb
    CROSS JOIN LATERAL jsonb_array_elements(sb.session_dates) AS session
    WHERE sb.coach_id = p_coach_id
      AND sb.status IN ('confirmed', 'payment_received', 'completed')
      AND (session->>'date')::DATE BETWEEN p_start_date AND v_end_date
    
    ORDER BY session_date, start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_points_booking_availability IS 
'Checks if a specific time slot is available for points booking.
Returns available=TRUE if slot is free, or available=FALSE with conflict details if blocked.
Checks against: monthly recurring bookings, flexible bookings, special bookings, and blocked dates.';
