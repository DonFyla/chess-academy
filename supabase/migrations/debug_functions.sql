-- Debug: Check if functions exist and test them

-- 1. List all functions related to booking
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname LIKE '%slot%' 
   OR proname LIKE '%unified%'
   OR proname LIKE '%schedule%'
   OR proname LIKE '%available%'
ORDER BY proname;

-- 2. Check function permissions
SELECT 
    proname,
    has_function_privilege('anon', oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', oid, 'EXECUTE') as auth_can_execute
FROM pg_proc 
WHERE proname IN ('is_slot_available', 'get_coach_unified_schedule');

-- 3. Test with a coach that exists (you'll need to replace with an actual coach_id)
-- First, let's get a sample coach_id:
SELECT id, name FROM coaches LIMIT 1;

-- 4. Then test the function (uncomment and replace COACH_ID):
-- SELECT * FROM get_coach_unified_schedule('COACH_ID_HERE', CURRENT_DATE, 30);

-- 5. Test slot availability (uncomment and replace COACH_ID):
-- SELECT is_slot_available('COACH_ID_HERE', CURRENT_DATE, '10:00'::TIME, '11:00'::TIME);
