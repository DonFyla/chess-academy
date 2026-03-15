-- Update Oluwadurotimi's rank_title to Nigeria's #12
-- This will show the badge on his elite coach card

UPDATE coaches
SET rank_title = 'Nigeria''s #12'
WHERE name ILIKE '%Oluwadurotimi%';

-- Verify the update
SELECT id, name, rank_title, is_special
FROM coaches
WHERE name ILIKE '%Oluwadurotimi%';
