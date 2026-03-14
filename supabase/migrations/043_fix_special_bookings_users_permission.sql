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
