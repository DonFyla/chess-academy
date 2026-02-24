-- Fix RLS policies for point_transactions
-- Users need to be able to create pending purchases

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can create point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Anyone can create point transactions" ON point_transactions;

-- Create new policy that allows users to create their own pending/completed transactions
CREATE POLICY "Users can create their own point transactions"
    ON point_transactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Update select policy to allow users to see their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON point_transactions;

CREATE POLICY "Users can view their own point transactions"
    ON point_transactions
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins can still do everything
DROP POLICY IF EXISTS "Admins can manage all point transactions" ON point_transactions;

CREATE POLICY "Admins can manage all point transactions"
    ON point_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Also fix flexible_bookings RLS to ensure it works properly
DROP POLICY IF EXISTS "Users can create their own flexible bookings" ON flexible_bookings;

CREATE POLICY "Users can create their own flexible bookings"
    ON flexible_bookings
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
