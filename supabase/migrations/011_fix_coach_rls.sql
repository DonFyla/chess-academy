-- Migration: Fix RLS policies for coaches table
-- Run this in Supabase SQL Editor

-- Enable RLS on coaches table (if not already enabled)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON coaches;
DROP POLICY IF EXISTS "Coaches can update their own profile" ON coaches;
DROP POLICY IF EXISTS "Only admins can insert coaches" ON coaches;
DROP POLICY IF EXISTS "Only admins can delete coaches" ON coaches;
DROP POLICY IF EXISTS "Admins can manage all coaches" ON coaches;

-- Create policies

-- Everyone can view coaches
CREATE POLICY "Coaches are viewable by everyone" 
  ON coaches FOR SELECT USING (true);

-- Admins can do everything
CREATE POLICY "Admins can manage all coaches" 
  ON coaches FOR ALL USING (
    EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Coaches can update their own profile (but not user_id)
CREATE POLICY "Coaches can update their own profile" 
  ON coaches FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON coaches TO authenticated;
GRANT ALL ON coaches TO service_role;

-- Also ensure sequences are accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
