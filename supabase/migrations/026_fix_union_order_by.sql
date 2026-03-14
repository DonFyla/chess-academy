-- Fix: Correct the ORDER BY clause in UNION query

DROP FUNCTION IF EXISTS get_coach_unified_schedule(UUID, DATE, INTEGER);

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
    
    -- Monthly recurring bookings (with proper subquery to handle ORDER BY)
    SELECT * FROM (
        SELECT 
            b.id as booking_id,
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
    ) monthly_bookings
    
    UNION ALL
    
    -- Point-based flexible bookings (with proper subquery)
    SELECT * FROM (
        SELECT 
            fb.id as booking_id,
            'points'::TEXT as booking_type,
            fb.session_date,
            fb.start_time,
            fb.end_time,
            COALESCE(u.email, 'Unknown') as student_name,
            u.email as student_email,
            fb.status
        FROM flexible_bookings fb
        LEFT JOIN LATERAL (
            SELECT email FROM auth.users WHERE id = fb.user_id
        ) u ON true
        WHERE fb.coach_id = p_coach_id
          AND fb.status IN ('confirmed', 'completed')
          AND fb.session_date BETWEEN p_start_date AND v_end_date
    ) point_bookings
    
    -- ORDER BY must be at the very end, outside the subqueries
    ORDER BY session_date, start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_coach_unified_schedule(UUID, DATE, INTEGER) TO authenticated;

-- Test it
SELECT 'Function recreated successfully!' as status;
