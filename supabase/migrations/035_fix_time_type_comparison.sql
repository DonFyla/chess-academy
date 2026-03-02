-- Fix time type comparison issues in conflict checking functions
-- The bookings table stores times as TEXT, but functions receive TIME parameters

-- Drop and recreate check_points_booking_availability with proper type casting
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
    -- Cast bookings.start_time and bookings.end_time to TIME for proper comparison
    SELECT b.id, b.student_name, b.start_time, b.end_time
    INTO v_monthly_booking
    FROM bookings b
    WHERE b.coach_id = p_coach_id
      AND b.status NOT IN ('rejected', 'cancelled')
      AND v_day_of_week = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
      AND b.start_time::TIME < p_end_time
      AND b.end_time::TIME > p_start_time
    LIMIT 1;
    
    IF FOUND THEN
        v_available := FALSE;
        v_conflict_type := 'monthly_booking';
        v_conflict_details := format('Booked by %s from %s to %s', 
            v_monthly_booking.student_name,
            v_monthly_booking.start_time,
            v_monthly_booking.end_time
        );
        RETURN QUERY SELECT v_available, v_conflict_type, v_conflict_details;
        RETURN;
    END IF;
    
    -- Check flexible bookings (these already use TIME type)
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
              (cbd.start_time::TIME < p_end_time AND cbd.end_time::TIME > p_start_time)
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

-- Also fix is_slot_available function with the same casting
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
    -- Cast bookings table times to TIME for proper comparison
    SELECT EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.coach_id = p_coach_id
          AND b.status NOT IN ('rejected', 'cancelled')
          AND v_day_of_week = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
          AND b.start_time::TIME < p_end_time
          AND b.end_time::TIME > p_start_time
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
              (cbd.start_time::TIME < p_end_time AND cbd.end_time::TIME > p_start_time)
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

-- Add comment
COMMENT ON FUNCTION check_points_booking_availability IS 
'Checks if a specific time slot is available for points booking.
Returns available=TRUE if slot is free, or available=FALSE with conflict details if blocked.
Checks against: monthly recurring bookings, flexible bookings, special bookings, and blocked dates.
Now with proper TIME type casting for the bookings table columns.';
