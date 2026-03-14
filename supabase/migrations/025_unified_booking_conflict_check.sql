-- Migration: Unified booking conflict checking across all booking types
-- This prevents double-booking when a coach has multiple booking types

-- Function 1: Check if a specific time slot is available
-- Returns TRUE if slot is free, FALSE if there's any conflict
CREATE OR REPLACE FUNCTION is_slot_available(
    p_coach_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check 1: Monthly recurring bookings (bookings table)
    -- A slot conflicts if:
    -- 1. Same coach
    -- 2. Active booking (not rejected/cancelled)
    -- 3. The day of week matches recurring_days
    -- 4. Time overlaps
    IF EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.coach_id = p_coach_id
          AND b.status NOT IN ('rejected', 'cancelled')
          AND EXTRACT(DOW FROM p_date) = ANY(b.recurring_days)
          AND b.start_time < p_end_time
          AND b.end_time > p_start_time
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check 2: Point-based flexible bookings
    IF EXISTS (
        SELECT 1 
        FROM flexible_bookings fb
        WHERE fb.coach_id = p_coach_id
          AND fb.session_date = p_date
          AND fb.status IN ('confirmed', 'completed')
          AND fb.start_time < p_end_time
          AND fb.end_time > p_start_time
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check 3: Special coach bookings
    IF EXISTS (
        SELECT 1 
        FROM special_bookings sb
        WHERE sb.coach_id = p_coach_id
          AND sb.status IN ('confirmed', 'payment_received')
          AND sb.session_dates @> jsonb_build_array(
              jsonb_build_object(
                  'date', to_char(p_date, 'YYYY-MM-DD'),
                  'start_time', to_char(p_start_time, 'HH24:MI'),
                  'end_time', to_char(p_end_time, 'HH24:MI')
              )
          )
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check 4: Coach blocked dates
    IF EXISTS (
        SELECT 1 
        FROM coach_blocked_dates cbd
        WHERE cbd.coach_id = p_coach_id
          AND cbd.blocked_date = p_date
          AND (
              -- Full day blocked
              (cbd.start_time IS NULL AND cbd.end_time IS NULL)
              OR
              -- Specific time blocked (check overlap)
              (cbd.start_time < p_end_time AND cbd.end_time > p_start_time)
          )
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- If we get here, the slot is available
    RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_slot_available(UUID, DATE, TIME, TIME) TO anon;
GRANT EXECUTE ON FUNCTION is_slot_available(UUID, DATE, TIME, TIME) TO authenticated;

COMMENT ON FUNCTION is_slot_available IS 'Checks if a time slot is available for booking across all booking types (monthly, points, special)';

-- Function 2: Get unified coach schedule
-- Returns all bookings for a coach across all types in a unified format
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
    status TEXT,
    points_used INTEGER,
    monthly_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_end_date DATE;
BEGIN
    v_end_date := p_start_date + p_days_ahead;
    
    RETURN QUERY
    
    -- Monthly recurring bookings (expanded to individual dates)
    SELECT 
        b.id as booking_id,
        'monthly'::TEXT as booking_type,
        (jsonb_array_elements(b.recurring_dates)->>'date')::DATE as session_date,
        (jsonb_array_elements(b.recurring_dates)->>'start_time')::TIME as start_time,
        (jsonb_array_elements(b.recurring_dates)->>'end_time')::TIME as end_time,
        b.student_name,
        b.student_email,
        b.status,
        NULL::INTEGER as points_used,
        b.monthly_amount
    FROM bookings b
    WHERE b.coach_id = p_coach_id
      AND b.status NOT IN ('rejected', 'cancelled')
      AND b.recurring_dates IS NOT NULL
      AND (jsonb_array_elements(b.recurring_dates)->>'date')::DATE BETWEEN p_start_date AND v_end_date
    
    UNION ALL
    
    -- Point-based flexible bookings
    SELECT 
        fb.id as booking_id,
        'points'::TEXT as booking_type,
        fb.session_date,
        fb.start_time,
        fb.end_time,
        COALESCE(u.full_name, u.email, 'Unknown') as student_name,
        u.email as student_email,
        fb.status,
        fb.points_used,
        NULL::DECIMAL as monthly_amount
    FROM flexible_bookings fb
    LEFT JOIN LATERAL get_single_user_info(fb.user_id) u ON true
    WHERE fb.coach_id = p_coach_id
      AND fb.status IN ('confirmed', 'completed')
      AND fb.session_date BETWEEN p_start_date AND v_end_date
    
    UNION ALL
    
    -- Special bookings (expanded from session_dates JSON)
    SELECT 
        sb.id as booking_id,
        'special'::TEXT as booking_type,
        (elem->>'date')::DATE as session_date,
        (elem->>'start_time')::TIME as start_time,
        (elem->>'end_time')::TIME as end_time,
        sb.student_name,
        sb.student_email,
        sb.status,
        NULL::INTEGER as points_used,
        sb.total_amount::DECIMAL as monthly_amount
    FROM special_bookings sb,
         jsonb_array_elements(sb.session_dates) as elem
    WHERE sb.coach_id = p_coach_id
      AND sb.status IN ('confirmed', 'payment_received')
      AND (elem->>'date')::DATE BETWEEN p_start_date AND v_end_date
    
    ORDER BY session_date, start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_coach_unified_schedule IS 'Returns unified schedule across all booking types (monthly, points, special) for a coach';

-- Function 3: Get available slots for a specific date
-- This is useful for the booking UI
CREATE OR REPLACE FUNCTION get_available_slots_for_date(
    p_coach_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.start_time,
        a.end_time,
        is_slot_available(p_coach_id, p_date, a.start_time, a.end_time) as is_available
    FROM availability_slots a
    WHERE a.coach_id = p_coach_id
      AND a.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
    ORDER BY a.start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_slots_for_date(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date(UUID, DATE) TO authenticated;

COMMENT ON FUNCTION get_available_slots_for_date IS 'Returns all time slots for a coach on a specific date with availability status';

-- Create index to speed up conflict checks on bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_coach_status ON bookings(coach_id, status) 
    WHERE status NOT IN ('rejected', 'cancelled');

-- Create index on flexible_bookings for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_flexible_bookings_coach_date_status 
    ON flexible_bookings(coach_id, session_date, status) 
    WHERE status IN ('confirmed', 'completed');

-- Create index on special_bookings for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_special_bookings_coach_status 
    ON special_bookings(coach_id, status) 
    WHERE status IN ('confirmed', 'payment_received');
