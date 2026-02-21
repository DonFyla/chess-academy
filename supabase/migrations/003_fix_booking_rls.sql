-- Migration: Fix RLS for anonymous bookings
-- Run this in Supabase SQL Editor

-- Fix bookings table policies

-- Drop and recreate anonymous booking policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous bookings" ON bookings;

CREATE POLICY "Allow anonymous bookings"
  ON bookings FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Drop and recreate select policy
DROP POLICY IF EXISTS "Bookings are viewable by coaches and admins" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;

CREATE POLICY "Anyone can view bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix availability_slots policies

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Availability is viewable by everyone" ON availability_slots;
DROP POLICY IF EXISTS "Anyone can view availability" ON availability_slots;

CREATE POLICY "Anyone can view availability"
  ON availability_slots FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix coaches policies

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON coaches;
DROP POLICY IF EXISTS "Anyone can view coaches" ON coaches;

CREATE POLICY "Anyone can view coaches"
  ON coaches FOR SELECT
  TO anon, authenticated
  USING (true);
