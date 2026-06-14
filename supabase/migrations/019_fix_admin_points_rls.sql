-- Fix admin access to point_transactions
-- The issue is that RLS policies check auth.uid() but admins need to see ALL records

-- First, let's make sure we have proper policies

-- Drop and recreate admin policy to ensure it works
DROP POLICY IF EXISTS "Admins can manage all point transactions" ON point_transactions;

-- Create admin policy that allows full access for admins
CREATE POLICY "Admins can manage all point transactions"
    ON point_transactions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Also ensure users can see their own
DROP POLICY IF EXISTS "Users can view their own point transactions" ON point_transactions;

CREATE POLICY "Users can view their own point transactions"
    ON point_transactions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own
DROP POLICY IF EXISTS "Users can create their own point transactions" ON point_transactions;

CREATE POLICY "Users can create their own point transactions"
    ON point_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Create a function for admin to get pending purchases
-- This bypasses RLS issues by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_pending_points_purchases()
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
        u.raw_user_meta_data->>'full_name' as user_name
    FROM point_transactions pt
    JOIN auth.users u ON pt.user_id = u.id
    WHERE pt.type = 'purchase' AND pt.status = 'pending'
    ORDER BY pt.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pending_points_purchases() TO authenticated;
