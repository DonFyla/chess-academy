-- Run this in Supabase SQL Editor to verify functions exist

-- Check if functions exist
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('is_slot_available', 'get_coach_unified_schedule', 'get_available_slots_for_date')
ORDER BY proname;

-- Test the function with a sample query (replace with actual coach_id)
-- SELECT * FROM get_coach_unified_schedule('your-coach-uuid-here', CURRENT_DATE, 30);
