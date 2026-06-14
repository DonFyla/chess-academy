-- Supabase Database Schema for Moving Train Chess Academy Scheduling System
-- Run this in your Supabase SQL Editor after creating the project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Coaches table
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  specialization TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability slots table (recurring weekly availability)
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TEXT NOT NULL, -- Format: "HH:MM" in 24-hour format
  end_time TEXT NOT NULL,   -- Format: "HH:MM" in 24-hour format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_phone TEXT,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL, -- Format: "HH:MM"
  end_time TEXT NOT NULL,   -- Format: "HH:MM"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  notes TEXT,
  course_type TEXT, -- 'beginner', 'intermediate', 'expert'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_availability_coach ON availability_slots(coach_id);
CREATE INDEX idx_bookings_coach ON bookings(coach_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_coaches_user ON coaches(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Coaches table policies
CREATE POLICY "Coaches are viewable by everyone" 
  ON coaches FOR SELECT USING (true);

CREATE POLICY "Coaches can update their own profile" 
  ON coaches FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert coaches" 
  ON coaches FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Only admins can delete coaches" 
  ON coaches FOR DELETE USING (
    EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Availability slots policies
CREATE POLICY "Availability is viewable by everyone" 
  ON availability_slots FOR SELECT USING (true);

CREATE POLICY "Coaches can manage their own availability" 
  ON availability_slots FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all availability" 
  ON availability_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Bookings policies
CREATE POLICY "Bookings are viewable by coaches and admins" 
  ON bookings FOR SELECT USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Anyone can create bookings" 
  ON bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Coaches can update their own bookings" 
  ON bookings FOR UPDATE USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all bookings" 
  ON bookings FOR ALL USING (
    EXISTS (SELECT 1 FROM coaches WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Seed data: Insert existing coaches
INSERT INTO coaches (name, bio, specialization, is_admin) VALUES 
(
  'FIDE Master Akintoye Abdulraheem',
  '2 time and current West African Chess champion. Nigeria''s Number 1 by FIDE. Winner of the Challenger A category at the Gibraltar Chess Festival 2019. Winner of the CPAN C4 Chevron Chess Challenge 2018. Winner of National Friends Of Chess 2018. Certified Lawyer. 2331 peak rating.',
  'Advanced Training, Tournament Preparation',
  true
),
(
  'Master Oluwadurotimi Lapite',
  'Nigeria''s Number 11 by FIDE. Winner of Millionaires Chess Tournament. Winner of Awesome Classical Tournament 2022. Winner of the President''s Cup, Ghana 2019. Winner of several editions of Chess Heights Monthly Rapid. 2238 peak rating.',
  'Intermediate to Advanced Training',
  false
);

-- Insert sample availability for FM Akintoye (coach_id will be auto-generated)
-- Note: You'll need to update the coach_id UUIDs after seeding
