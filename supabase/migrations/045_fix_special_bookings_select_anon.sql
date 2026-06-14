-- Fix special_bookings SELECT policy for anonymous users
-- The issue: .select() after insert fails for anonymous users
-- because current_user != student_email for anon users

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Ensure RLS is enabled
-- ============================================
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create working policies
-- ============================================

-- INSERT: Allow anyone to create bookings
CREATE POLICY "insert_all"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT: Allow anyone to select (we filter in application layer)
-- This is needed because .select() after insert fails for anon users
-- with email-based policies since current_user != provided email
CREATE POLICY "select_all"
    ON special_bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- UPDATE: Users by email, coaches by assignment, admins all
CREATE POLICY "update_own_or_assigned"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        student_email = current_user
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Admin only
CREATE POLICY "delete_admin"
    ON special_bookings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- STEP 4: Verify
-- ============================================
SELECT 
    policyname,
    permissive,
    roles::text,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'special_bookings'
ORDER BY cmd;
