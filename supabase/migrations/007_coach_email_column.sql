-- Migration: Add email column to coaches table
-- Run this in Supabase SQL Editor

-- Add email column to coaches table
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comment
COMMENT ON COLUMN coaches.email IS 'Coach email address for booking notifications';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- Update existing coaches with example emails (replace with actual emails)
-- UPDATE coaches SET email = 'coach@example.com' WHERE email IS NULL;
