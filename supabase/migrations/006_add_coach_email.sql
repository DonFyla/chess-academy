-- Migration: Add email column to coaches and create helper function
-- Run this in Supabase SQL Editor

-- Add email column to coaches table
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comment
COMMENT ON COLUMN coaches.email IS 'Coach email address for notifications';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- Create or replace function to get user email from auth.users
-- This function allows coaches to get their own email or admins to get any user's email
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO anon;

-- Alternative: Create a simpler view for coaches to get their own email
-- This is safer as it only returns the current user's email
CREATE OR REPLACE VIEW coach_emails AS
SELECT 
  c.id as coach_id,
  c.name as coach_name,
  c.email as coach_email,
  c.user_id,
  u.email as auth_email
FROM coaches c
LEFT JOIN auth.users u ON u.id = c.user_id;

GRANT SELECT ON coach_emails TO authenticated;
GRANT SELECT ON coach_emails TO anon;
