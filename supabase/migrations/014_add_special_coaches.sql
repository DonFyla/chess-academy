-- Add special coaches support
-- Special coaches are high-ranked coaches (FIDE Masters, National Champions, etc.)
-- They offer per-session booking instead of monthly packages

-- Add columns to coaches table
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rank_title TEXT, -- e.g., "Nigeria's #1", "FIDE Master", "National Champion"
ADD COLUMN IF NOT EXISTS hourly_rate INTEGER, -- Rate per session in Naira
ADD COLUMN IF NOT EXISTS achievements TEXT[], -- Array of achievements
ADD COLUMN IF NOT EXISTS special_bio TEXT, -- Extended bio for special coaches
ADD COLUMN IF NOT EXISTS featured_order INTEGER; -- Order to display (1 = first)

-- Create index for filtering special coaches
CREATE INDEX IF NOT EXISTS idx_coaches_is_special ON coaches(is_special) WHERE is_special = TRUE;
CREATE INDEX IF NOT EXISTS idx_coaches_featured_order ON coaches(featured_order) WHERE is_special = TRUE;

-- Add comment
COMMENT ON COLUMN coaches.is_special IS 'High-ranked coaches with per-session booking';
COMMENT ON COLUMN coaches.rank_title IS 'Display title like Nigeria''s #1 or FIDE Master';
COMMENT ON COLUMN coaches.hourly_rate IS 'Per session rate in Naira (e.g., 15000 for ₦15,000)';
