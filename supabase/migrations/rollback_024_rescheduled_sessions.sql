-- Rollback: Undo the rescheduled_sessions migration
-- Run this in Supabase SQL Editor to revert changes

-- Step 1: Drop the rescheduled_sessions table (this drops all policies and indexes too)
DROP TABLE IF EXISTS rescheduled_sessions CASCADE;

-- Step 2: Drop the student_id column from bookings (if it was added)
-- Note: This will fail if the column doesn't exist, which is fine
ALTER TABLE bookings DROP COLUMN IF EXISTS student_id;

-- Step 3: Drop the index (if it exists)
DROP INDEX IF EXISTS idx_bookings_student_id;

-- Done! The database is now back to the state before migration 024
