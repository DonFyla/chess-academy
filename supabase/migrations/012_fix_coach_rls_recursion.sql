-- Migration: Fix RLS recursion issue for coaches table
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to clean up
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON coaches;
DROP POLICY IF EXISTS "Coaches can update their own profile" ON coaches;
DROP POLICY IF EXISTS "Only admins can insert coaches" ON coaches;
DROP POLICY IF EXISTS "Only admins can delete coaches" ON coaches;
DROP POLICY IF EXISTS "Admins can manage all coaches" ON coaches;

-- Re-enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view coaches (no recursion)
CREATE POLICY "Coaches are viewable by everyone" 
  ON coaches FOR SELECT USING (true);

-- Policy 2: Admins can insert/delete/update coaches
-- Uses a subquery that bypasses RLS by using WITH CHECK (true) in a different way
-- Or we use security definer functions
CREATE POLICY "Admins can insert coaches" 
  ON coaches FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c 
      WHERE c.user_id = auth.uid() 
      AND c.is_admin = true
    )
  );

-- Policy 3: Admins can update any coach, coaches can update own profile
CREATE POLICY "Admins and coaches can update" 
  ON coaches FOR UPDATE 
  USING (
    -- Allow if user is the coach themselves
    user_id = auth.uid()
    OR 
    -- Allow if user is an admin (check via subquery with security barrier)
    EXISTS (
      SELECT 1 FROM coaches c 
      WHERE c.user_id = auth.uid() 
      AND c.is_admin = true
    )
  );

-- Policy 4: Admins can delete coaches
CREATE POLICY "Admins can delete coaches" 
  ON coaches FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM coaches c 
      WHERE c.user_id = auth.uid() 
      AND c.is_admin = true
    )
  );

-- Alternative simpler approach: Use a security definer function
-- This completely bypasses RLS for admin checks

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with privileges of function owner
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coaches 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- Alternative policies using the function (more reliable)
-- Drop the previous policies and use these instead:

-- For UPDATE using function
DROP POLICY IF EXISTS "Admins and coaches can update" ON coaches;

CREATE POLICY "Admins and coaches can update" 
  ON coaches FOR UPDATE 
  USING (
    user_id = auth.uid() OR is_current_user_admin()
  );

-- For INSERT using function
DROP POLICY IF EXISTS "Admins can insert coaches" ON coaches;

CREATE POLICY "Admins can insert coaches" 
  ON coaches FOR INSERT 
  WITH CHECK (is_current_user_admin());

-- For DELETE using function
DROP POLICY IF EXISTS "Admins can delete coaches" ON coaches;

CREATE POLICY "Admins can delete coaches" 
  ON coaches FOR DELETE 
  USING (is_current_user_admin());
