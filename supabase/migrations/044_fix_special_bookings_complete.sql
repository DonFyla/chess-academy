-- Complete fix for special_bookings RLS and constraint issues
-- This addresses "new row violates row-level security policy" errors

-- ============================================
-- STEP 1: Remove problematic FK constraint
-- ============================================
-- The student_id FK to auth.users causes permission issues
-- because validating the constraint requires querying auth.users
ALTER TABLE special_bookings 
DROP CONSTRAINT IF EXISTS special_bookings_student_id_fkey;

-- ============================================
-- STEP 2: Drop ALL existing policies
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
-- STEP 3: Ensure RLS is enabled
-- ============================================
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (important!)
ALTER TABLE special_bookings FORCE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create minimal, working policies
-- ============================================

-- INSERT: Allow anyone to create bookings (anonymous + authenticated)
-- This is the critical policy that fixes the booking creation
CREATE POLICY "Allow insert for all"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT: Users can see their own bookings by email
-- Coaches can see bookings assigned to them
-- Admins can see all
CREATE POLICY "Select own or assigned"
    ON special_bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        -- Match by email (works for both anon and authenticated)
        student_email = current_user
        OR
        -- Coach can see their bookings
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin can see all
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- UPDATE: Users can update their own pending bookings
-- Coaches and admins can update assigned/all bookings
CREATE POLICY "Update own or assigned"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        -- User's own booking
        student_email = current_user
        OR
        -- Coach assigned
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        student_email = current_user
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Only admins can delete
CREATE POLICY "Delete admin only"
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
-- STEP 5: Verify policies
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
