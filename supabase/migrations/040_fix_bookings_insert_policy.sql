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
