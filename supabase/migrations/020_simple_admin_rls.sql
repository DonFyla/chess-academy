-- Simple RLS fix for admin access to point_transactions
-- Run this in Supabase SQL Editor

-- Enable RLS on point_transactions (if not already)
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on point_transactions
DROP POLICY IF EXISTS "Users can create their own point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Users can view their own point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can view all point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can update point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can manage all point transactions" ON point_transactions;

-- Policy 1: Users can create (insert) their own transactions
CREATE POLICY "Users insert own transactions"
    ON point_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy 2: Users can view their own transactions
CREATE POLICY "Users view own transactions"
    ON point_transactions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 3: Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins full access"
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

-- Alternative: Create a view that bypasses RLS for admins
-- This is safer and more reliable

-- Drop existing view if exists
DROP VIEW IF EXISTS admin_pending_purchases;

-- Create view for pending purchases with user info
CREATE VIEW admin_pending_purchases AS
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
WHERE pt.type = 'purchase' AND pt.status = 'pending';

-- Grant access to the view
GRANT SELECT ON admin_pending_purchases TO authenticated;

-- Create function to get pending purchases (simpler version)
CREATE OR REPLACE FUNCTION get_pending_purchases()
RETURNS SETOF admin_pending_purchases
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM admin_pending_purchases;
$$;

GRANT EXECUTE ON FUNCTION get_pending_purchases() TO authenticated;
