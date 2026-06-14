-- Update elite/special coaches to have points_cost = 2
-- This ensures all FIDE Masters and elite coaches cost 2 points per class

UPDATE coaches
SET points_cost = 2
WHERE is_special = true
   OR points_cost IS NULL
   OR points_cost < 2;

-- Ensure regular coaches have points_cost = 1
UPDATE coaches
SET points_cost = 1
WHERE is_special = false
  AND (points_cost IS NULL OR points_cost != 1);

-- Set default for future inserts
ALTER TABLE coaches 
ALTER COLUMN points_cost SET DEFAULT 1;

-- Verify the update
SELECT 
    is_special,
    COUNT(*) as coach_count,
    MIN(points_cost) as min_points,
    MAX(points_cost) as max_points
FROM coaches
GROUP BY is_special;
