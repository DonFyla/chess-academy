-- Aggressive fix for special_bookings RLS issues

-- Step 1: Disable RLS temporarily
ALTER TABLE special_bookings DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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

-- Step 3: Re-enable RLS
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create minimal working policies

-- SELECT: Users can see their own bookings OR coaches can see their assigned bookings
CREATE POLICY "select_own_or_coach"
    ON special_bookings
    FOR SELECT
    USING (
        student_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- INSERT: Allow all inserts (with true)
CREATE POLICY "insert_any"
    ON special_bookings
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Only students, assigned coaches, or admins
CREATE POLICY "update_own_or_coach"
    ON special_bookings
    FOR UPDATE
    USING (
        student_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Only admins
CREATE POLICY "delete_admin_only"
    ON special_bookings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Step 5: Verify
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'special_bookings';
