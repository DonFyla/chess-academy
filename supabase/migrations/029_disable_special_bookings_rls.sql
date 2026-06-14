-- Temporary fix: Disable RLS on special_bookings completely
-- This allows all operations while we debug the issue

-- Disable RLS completely
ALTER TABLE special_bookings DISABLE ROW LEVEL SECURITY;

-- Drop all policies (clean slate)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
END $$;

-- Verify RLS is disabled
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'special_bookings';
