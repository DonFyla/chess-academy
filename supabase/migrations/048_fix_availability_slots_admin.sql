-- Fix availability_slots RLS - add admin policy
-- Admins need to be able to add/edit schedules for coaches

-- ============================================
-- STEP 1: Drop all existing policies
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'availability_slots'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON availability_slots', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Ensure RLS is enabled
-- ============================================
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create new policies
-- ============================================

-- SELECT: Anyone can view availability
CREATE POLICY "availability_select_all"
    ON availability_slots
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT: Coaches can add their own, admins can add for any
CREATE POLICY "availability_insert"
    ON availability_slots
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Coach adding their own availability
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        -- Admin adding for any coach
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- UPDATE: Coaches can update their own, admins can update any
CREATE POLICY "availability_update"
    ON availability_slots
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Coaches can delete their own, admins can delete any
CREATE POLICY "availability_delete"
    ON availability_slots
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- STEP 4: Also fix coach_blocked_dates (same issue likely)
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'coach_blocked_dates'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON coach_blocked_dates', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE coach_blocked_dates ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone can view blocked dates
CREATE POLICY "blocked_dates_select_all"
    ON coach_blocked_dates
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT: Coaches own, admins any
CREATE POLICY "blocked_dates_insert"
    ON coach_blocked_dates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- UPDATE: Coaches own, admins any
CREATE POLICY "blocked_dates_update"
    ON coach_blocked_dates
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Coaches own, admins any
CREATE POLICY "blocked_dates_delete"
    ON coach_blocked_dates
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- STEP 5: Verify
-- ============================================
SELECT 'availability_slots policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'availability_slots';

SELECT 'coach_blocked_dates policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'coach_blocked_dates';
