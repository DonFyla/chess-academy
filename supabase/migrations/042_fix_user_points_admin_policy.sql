-- Fix user_points RLS policy to allow admins to INSERT and UPDATE
-- This fixes "new row violates row-level security policy" error when confirming points

-- Drop all existing user_points policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_points'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_points', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own points
CREATE POLICY "Users view own points"
    ON user_points
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Policy 2: Admins can INSERT new user_points records
CREATE POLICY "Admins insert user points"
    ON user_points
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Policy 3: Admins can UPDATE any user_points record
CREATE POLICY "Admins update user points"
    ON user_points
    FOR UPDATE
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

-- Policy 4: Users can update their own records (for balance updates from bookings)
CREATE POLICY "Users update own points"
    ON user_points
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verify policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'user_points';
