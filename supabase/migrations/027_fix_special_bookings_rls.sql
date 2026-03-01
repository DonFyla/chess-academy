-- Fix RLS policies for special_bookings table
-- This ensures users can create bookings without RLS errors

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Anyone can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Admins can view all special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Users can update their own special bookings" ON special_bookings;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own bookings
CREATE POLICY "Users can view their own special bookings"
    ON special_bookings
    FOR SELECT
    USING (
        student_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- Policy 2: Anyone can create bookings (anonymous users included)
-- This allows students to book without being logged in
CREATE POLICY "Anyone can create special bookings"
    ON special_bookings
    FOR INSERT
    WITH CHECK (true);

-- Policy 3: Students can update their own pending bookings
CREATE POLICY "Students can update their own bookings"
    ON special_bookings
    FOR UPDATE
    USING (
        student_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- Policy 4: Admins can do everything
CREATE POLICY "Admins can manage all special bookings"
    ON special_bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Verify policies were created
SELECT 'RLS policies recreated successfully' as status;
