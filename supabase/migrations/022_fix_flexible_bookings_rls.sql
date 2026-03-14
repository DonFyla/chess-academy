-- Fix RLS policies for flexible_bookings to allow viewing

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "Admins can view all flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "Coaches can view their own flexible bookings" ON flexible_bookings;

-- Create policy for users to view their own bookings
CREATE POLICY "Users can view their own flexible bookings"
    ON flexible_bookings
    FOR SELECT
    USING (user_id = auth.uid());

-- Create policy for coaches to view bookings assigned to them
CREATE POLICY "Coaches can view their own flexible bookings"
    ON flexible_bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = flexible_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- Create policy for admins to view all bookings
CREATE POLICY "Admins can view all flexible bookings"
    ON flexible_bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );
