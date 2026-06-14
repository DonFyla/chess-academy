-- Migration: Add meeting_link column to coaches table
-- Run this in Supabase SQL Editor

-- Add meeting_link column
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add comment
COMMENT ON COLUMN coaches.meeting_link IS 'Zoom/Google Meet link for online classes';

-- Update existing coaches with placeholder (to be filled by coaches)
-- UPDATE coaches SET meeting_link = 'https://zoom.us/j/example' WHERE meeting_link IS NULL;
