-- Migration: Update bookings for recurring monthly subscription model
-- Run this in Supabase SQL Editor

-- Add new columns for recurring bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_days INTEGER[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_dates JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sessions_per_month INTEGER DEFAULT 4;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'single' CHECK (booking_mode IN ('single', 'double'));

-- Add comment explaining the columns
COMMENT ON COLUMN bookings.recurring_days IS 'Array of day indices (0-6) for weekly recurring sessions';
COMMENT ON COLUMN bookings.recurring_dates IS 'JSON array of specific dates for the month';
COMMENT ON COLUMN bookings.monthly_amount IS 'Total monthly subscription amount';

-- Create a function to get day of week from date (0=Sunday, 6=Saturday)
CREATE OR REPLACE FUNCTION get_day_of_week(p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(DOW FROM p_date)::INTEGER;
END;
$$;

-- Update existing bookings to have recurring_days based on their booking_date
UPDATE bookings 
SET recurring_days = ARRAY[get_day_of_week(booking_date)]::integer[],
    booking_mode = 'single',
    sessions_per_month = 4
WHERE recurring_days IS NULL;

-- Create function to check if a day is available (not booked for the month)
CREATE OR REPLACE FUNCTION is_day_available(p_coach_id UUID, p_day_of_week INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if any active booking uses this day for this coach
  RETURN NOT EXISTS (
    SELECT 1 
    FROM bookings 
    WHERE coach_id = p_coach_id
      AND p_day_of_week = ANY(recurring_days)
      AND status NOT IN ('rejected', 'cancelled')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_day_available(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION is_day_available(UUID, INTEGER) TO authenticated;

-- Create view for available days per coach
CREATE OR REPLACE VIEW available_days AS
SELECT 
  c.id as coach_id,
  c.name as coach_name,
  a.day_of_week,
  a.start_time,
  a.end_time,
  NOT EXISTS (
    SELECT 1 
    FROM bookings b
    WHERE b.coach_id = c.id
      AND a.day_of_week = ANY(b.recurring_days)
      AND b.status NOT IN ('rejected', 'cancelled')
  ) as is_available
FROM coaches c
JOIN availability_slots a ON a.coach_id = c.id;

GRANT SELECT ON available_days TO anon;
GRANT SELECT ON available_days TO authenticated;
