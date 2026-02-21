-- Migration: Add payment tracking columns to bookings
-- Run this in Supabase SQL Editor

-- Add payment tracking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add comments
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN bookings.payment_date IS 'When payment was received';
COMMENT ON COLUMN bookings.payment_method IS 'Payment method used: bank_transfer, whatsapp, etc.';
COMMENT ON COLUMN bookings.payment_amount IS 'Actual amount paid (may differ from monthly_amount if discounted)';
COMMENT ON COLUMN bookings.payment_reference IS 'Bank transfer reference or transaction ID';

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
