-- Re-enable RLS on special_bookings with proper policies
-- This migration adds comprehensive RLS policies for the special_bookings table

-- First, re-enable RLS
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Coaches can view their special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Admins can view all special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Anyone can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Users can update their own pending special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Admins can update all special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Users can delete their own pending special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Admins can delete all special bookings" ON special_bookings;

-- Create policies

-- 1. Students can view their own bookings (by email match since they might not be logged in)
CREATE POLICY "Users can view their own special bookings"
  ON special_bookings
  FOR SELECT
  USING (
    student_email = auth.jwt() ->> 'email'
    OR 
    student_id = auth.uid()
  );

-- 2. Coaches can view bookings assigned to them
CREATE POLICY "Coaches can view their special bookings"
  ON special_bookings
  FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- 3. Admins can view all bookings (using coaches.is_admin instead of user_roles)
CREATE POLICY "Admins can view all special bookings"
  ON special_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- 4. Anyone can create bookings (for anonymous booking flow)
-- This allows users to book without being logged in
CREATE POLICY "Anyone can create special bookings"
  ON special_bookings
  FOR INSERT
  WITH CHECK (true);

-- 5. Students can update their own pending bookings
CREATE POLICY "Users can update their own pending special bookings"
  ON special_bookings
  FOR UPDATE
  USING (
    status = 'pending_payment'
    AND (
      student_email = auth.jwt() ->> 'email'
      OR 
      student_id = auth.uid()
    )
  );

-- 6. Admins can update any booking (for payment confirmation, etc.)
CREATE POLICY "Admins can update all special bookings"
  ON special_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coaches 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- 7. Students can delete their own pending bookings
CREATE POLICY "Users can delete their own pending special bookings"
  ON special_bookings
  FOR DELETE
  USING (
    status = 'pending_payment'
    AND (
      student_email = auth.jwt() ->> 'email'
      OR 
      student_id = auth.uid()
    )
  );

-- 8. Admins can delete any booking
CREATE POLICY "Admins can delete all special bookings"
  ON special_bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coaches 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Add comment to document the policies
COMMENT ON TABLE special_bookings IS 'Special per-session coach bookings with RLS enabled. Policies allow: students to view/manage their own bookings, coaches to view their bookings, admins full access (checked via coaches.is_admin), and anyone to create bookings for anonymous booking flow.';
