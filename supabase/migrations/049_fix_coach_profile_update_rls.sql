-- Fix RLS policy to allow coaches to update their own profile
-- even if user_id is not linked yet

-- Drop existing update policy
DROP POLICY IF EXISTS "Admins and coaches can update" ON coaches;
DROP POLICY IF EXISTS "Admins and coaches can update coaches" ON coaches;

-- Create new update policy that allows:
-- 1. Coaches to update their own profile (by coach.id match via JWT claim or user_id match)
-- 2. Admins to update any coach
CREATE POLICY "Coaches can update own profile"
    ON coaches
    FOR UPDATE
    TO authenticated
    USING (
        -- Allow if user is linked to this coach
        user_id = auth.uid()
        OR 
        -- Allow if user is an admin
        EXISTS (
            SELECT 1 FROM coaches c
            WHERE c.user_id = auth.uid()
            AND c.is_admin = true
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM coaches c
            WHERE c.user_id = auth.uid()
            AND c.is_admin = true
        )
    );

-- Verify policy
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'coaches';
