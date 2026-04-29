-- Migration: Remove unused views and functions flagged by Supabase security audit
-- Date: 2026-04-29
-- Branch: paystack
--
-- These views were confirmed unused after exhaustive codebase search (all 100+ JS/JSX files in src/).
-- They expose auth.users data and have SECURITY DEFINER properties.

-- 1. Drop unused view: coach_emails
--    Exposes: coach_id, coach_name, coach_email, user_id, auth_email
--    Frontend usage: NONE (zero references in src/)
--    Alternative used: get_user_email() RPC in useBookings.js
DROP VIEW IF EXISTS public.coach_emails;

-- 2. Drop unused view: pending_points_purchases
--    Exposes: point_transactions + user_email, user_name from auth.users
--    Frontend usage: NONE (zero references in src/)
--    Alternative used: get_pending_purchases() RPC in useAdminPoints.js
DROP VIEW IF EXISTS public.pending_points_purchases;

-- 3. Drop unused view: available_days
--    Exposes: coach availability slots + is_available boolean
--    Frontend usage: NONE (zero references in src/)
DROP VIEW IF EXISTS public.available_days;

-- 4. Fix get_pending_purchases() to NOT depend on admin_pending_purchases view
--    The old function returned SETOF admin_pending_purchases, creating a dependency.
--    We recreate it with explicit return type so the view can be dropped.
DROP FUNCTION IF EXISTS public.get_pending_purchases();

CREATE OR REPLACE FUNCTION public.get_pending_purchases()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    amount INTEGER,
    payment_reference TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    user_email TEXT,
    user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM coaches 
        WHERE coaches.user_id = auth.uid() 
        AND coaches.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    RETURN QUERY
    SELECT 
        pt.id,
        pt.user_id,
        pt.amount,
        pt.payment_reference,
        pt.description,
        pt.created_at,
        pt.expires_at,
        u.email as user_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email) as user_name
    FROM point_transactions pt
    JOIN auth.users u ON pt.user_id = u.id
    WHERE pt.type = 'purchase' AND pt.status = 'pending'
    ORDER BY pt.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_purchases() TO authenticated;

-- 5. Now safe to drop the view (no more dependencies)
--    Exposes: point_transactions + user_email, user_name from auth.users
--    Frontend usage: Previously used as fallback in useAdminPoints.js (line 25).
--                    Fallback code removed. Primary method is get_pending_purchases() RPC.
DROP VIEW IF EXISTS public.admin_pending_purchases;

-- 6. Drop unused function: is_day_available
--    Frontend usage: NONE (zero .rpc() references in src/)
DROP FUNCTION IF EXISTS is_day_available(UUID, INTEGER);

-- 7. Drop unused function: get_pending_points_purchases
--    Note: This is DIFFERENT from get_pending_purchases() which IS actively used.
--    Frontend usage: NONE (zero .rpc() references in src/)
DROP FUNCTION IF EXISTS get_pending_points_purchases();

-- Verify cleanup
SELECT proname AS remaining_function
FROM pg_proc
WHERE proname IN ('get_pending_purchases', 'get_user_email', 'is_day_available', 'get_pending_points_purchases')
ORDER BY proname;
