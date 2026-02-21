-- Migration: Fix get_all_users function to match return type
-- Run this in Supabase SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_users();

-- Create the function with correct return type
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF auth.users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM auth.users ORDER BY created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO service_role;

-- Alternative: Create a view instead (simpler approach)
-- DROP VIEW IF EXISTS admin_users_view;
-- CREATE VIEW admin_users_view AS
-- SELECT 
--   id,
--   email,
--   created_at,
--   raw_user_meta_data as user_metadata
-- FROM auth.users
-- ORDER BY created_at DESC;
-- 
-- GRANT SELECT ON admin_users_view TO authenticated;
