-- Temporary RLS Fix for Local Testing
-- Run this in Supabase SQL Editor to allow testing without authentication

-- Disable RLS on availability_slots for testing (RE-ENABLE IN PRODUCTION!)
ALTER TABLE availability_slots DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a policy that allows all inserts for testing
-- CREATE POLICY "Allow all inserts for testing" 
--   ON availability_slots FOR INSERT 
--   WITH CHECK (true);

-- Verify coaches exist
SELECT * FROM coaches;

-- Check if any availability exists
SELECT * FROM availability_slots;
