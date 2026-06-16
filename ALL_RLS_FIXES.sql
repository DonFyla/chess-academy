-- Update elite/special coaches to have points_cost = 2
-- This ensures all FIDE Masters and elite coaches cost 2 points per class

UPDATE coaches
SET points_cost = 2
WHERE is_special = true
   OR points_cost IS NULL
   OR points_cost < 2;

-- Ensure regular coaches have points_cost = 1
UPDATE coaches
SET points_cost = 1
WHERE is_special = false
  AND (points_cost IS NULL OR points_cost != 1);

-- Set default for future inserts
ALTER TABLE coaches 
ALTER COLUMN points_cost SET DEFAULT 1;

-- Verify the update
SELECT 
    is_special,
    COUNT(*) as coach_count,
    MIN(points_cost) as min_points,
    MAX(points_cost) as max_points
FROM coaches
GROUP BY is_special;
-- Fix bookings INSERT policy to allow anonymous bookings
-- This fixes the "new row violates row-level security policy" error

-- First, drop all existing bookings policies to clean up
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bookings', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can create bookings (CRITICAL for guest booking flow)
-- This allows both logged-in users and anonymous users to create bookings
CREATE POLICY "Allow anonymous bookings"
    ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy 2: View bookings - users can see their own by email, coaches see assigned, admins see all
CREATE POLICY "Users view own bookings"
    ON bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        -- Student can view their own bookings by email match
        student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR
        -- Coach can view bookings assigned to them
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin can view all
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Policy 3: Coaches and admins can update bookings
CREATE POLICY "Coaches and admins update bookings"
    ON bookings
    FOR UPDATE
    TO authenticated
    USING (
        -- Coach assigned to this booking
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin can update any
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Verify the policies are created
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bookings';
-- Fix bookings RLS policy - remove auth.users subquery causing permission denied
-- Use current_user instead which doesn't require special permissions

-- Drop all existing bookings policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bookings', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can create bookings (guest booking flow)
CREATE POLICY "Allow anonymous bookings"
    ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy 2: View bookings
-- Students: can see bookings where their email matches
-- Coaches: can see bookings assigned to them  
-- Admins: can see all bookings
CREATE POLICY "Users view own bookings"
    ON bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        -- For authenticated users: match by email from session
        (auth.uid() IS NOT NULL AND student_email = current_user)
        OR
        -- For anonymous users: match by email provided (stored in student_email)
        (auth.uid() IS NULL AND student_email IS NOT NULL)
        OR
        -- Coach assigned to this booking
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin can view all
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Policy 3: Update bookings - coaches and admins only
CREATE POLICY "Coaches and admins update bookings"
    ON bookings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Verify policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'bookings';
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
-- Fix special_bookings RLS policy - remove auth.users subquery causing permission denied
-- Use current_user instead which doesn't require special permissions

-- Drop all existing special_bookings policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can create special bookings (anonymous booking flow)
CREATE POLICY "Anyone can create special bookings"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Users can view their own special bookings
-- FIXED: Use current_user instead of auth.users subquery
CREATE POLICY "Users view own special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        -- For authenticated users: match by email from session
        (auth.uid() IS NOT NULL AND student_email = current_user)
        OR
        -- For anonymous users: match by email provided
        (auth.uid() IS NULL AND student_email IS NOT NULL)
        OR
        -- Coach assigned to this booking
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin can view all
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Coaches can view their special bookings
CREATE POLICY "Coaches view their special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- Admins can view all special bookings
CREATE POLICY "Admins view all special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Users can update their own pending special bookings
-- FIXED: Use current_user instead of auth.users subquery
CREATE POLICY "Users update own pending special bookings"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        student_email = current_user
        AND status = 'pending_payment'
    )
    WITH CHECK (
        student_email = current_user
        AND status = 'pending_payment'
    );

-- Admins can update all special bookings
CREATE POLICY "Admins update all special bookings"
    ON special_bookings
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

-- Verify policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'special_bookings';
