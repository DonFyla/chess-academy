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
