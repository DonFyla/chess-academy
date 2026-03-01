-- Simple version: Check slot availability across all booking types
-- Run this in Supabase SQL Editor

-- Function: Check if a slot is available
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
BEGIN
    -- Check 1: Monthly recurring bookings
    SELECT EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.coach_id = p_coach_id
          AND b.status NOT IN ('rejected', 'cancelled')
          AND EXTRACT(DOW FROM p_date) = ANY(COALESCE(b.recurring_days, ARRAY[]::INTEGER[]))
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

-- Function: Get unified schedule (simpler version)
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
    
    -- Monthly recurring bookings (check if any recurring date falls in range)
    SELECT 
        b.id,
        'monthly'::TEXT,
        d.date_val,
        b.start_time::TIME,
        b.end_time::TIME,
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
        'points'::TEXT,
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
    
    -- Special bookings (expand JSONB session_dates)
    SELECT 
        sb.id,
        'special'::TEXT,
        (session->>'date')::DATE,
        (session->>'start_time')::TIME,
        (session->>'end_time')::TIME,
        sb.student_name,
        sb.student_email,
        sb.status
    FROM special_bookings sb
    CROSS JOIN LATERAL jsonb_array_elements(sb.session_dates) AS session
    WHERE sb.coach_id = p_coach_id
      AND sb.status IN ('confirmed', 'payment_received', 'completed')
      AND (session->>'date')::DATE BETWEEN p_start_date AND v_end_date
    
    ORDER BY 3, 4;  -- session_date, start_time
END;
$$;

GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO authenticated;

-- Verify functions were created
DO $$
BEGIN
    RAISE NOTICE 'Functions created successfully!';
    RAISE NOTICE 'is_slot_available: %', (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_slot_available'));
    RAISE NOTICE 'get_coach_unified_schedule: %', (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_coach_unified_schedule'));
END $$;
