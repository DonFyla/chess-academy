-- Fix get_coach_unified_schedule to handle both recurring_dates (JSONB) and recurring_days
-- The bookings table can have either format, so we need to check both

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
    
    -- Monthly recurring bookings with recurring_dates JSONB array
    SELECT 
        b.id,
        'monthly'::TEXT as booking_type,
        (rd->>'date')::DATE as session_date,
        (rd->>'start_time')::TIME as start_time,
        (rd->>'end_time')::TIME as end_time,
        b.student_name,
        b.student_email,
        b.status
    FROM bookings b
    CROSS JOIN LATERAL jsonb_array_elements(b.recurring_dates) AS rd
    WHERE b.coach_id = p_coach_id
      AND b.status NOT IN ('rejected', 'cancelled')
      AND b.recurring_dates IS NOT NULL
      AND (rd->>'date')::DATE BETWEEN p_start_date AND v_end_date
    
    UNION ALL
    
    -- Monthly recurring bookings with recurring_days array (fallback)
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
      AND (b.recurring_dates IS NULL OR b.recurring_dates = '[]'::jsonb)
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

COMMENT ON FUNCTION get_coach_unified_schedule IS 
'Returns unified schedule across all booking types (monthly, points, special) for a coach.
Now handles both recurring_dates (JSONB) and recurring_days (array) formats for monthly bookings.';
