-- Fix ALL bookings tables RLS policies
-- Addresses RLS errors on bookings, special_bookings, flexible_bookings

-- ============================================
-- STEP 1: Fix audit_log (ensure INSERT policy exists)
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON audit_log', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "audit_log_insert_all"
    ON audit_log
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "audit_log_select_admin"
    ON audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- STEP 2: Fix log_audit_event function
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    v_user_id := auth.uid();
    
    BEGIN
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
        v_user_email := NULL;
    END;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, user_id, user_email)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), v_user_id, v_user_email);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), v_user_id, v_user_email);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data, user_id, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), v_user_id, v_user_email);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Fix BOOKINGS table
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bookings', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- INSERT: Allow anyone
CREATE POLICY "bookings_insert_all"
    ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT: Allow anyone (application filters)
CREATE POLICY "bookings_select_all"
    ON bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- UPDATE: Own by email, coaches, admins
CREATE POLICY "bookings_update"
    ON bookings
    FOR UPDATE
    TO authenticated
    USING (
        student_email = current_user
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- DELETE: Admin only
CREATE POLICY "bookings_delete_admin"
    ON bookings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Recreate trigger
DROP TRIGGER IF EXISTS audit_bookings ON bookings;
CREATE TRIGGER audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================
-- STEP 4: Fix SPECIAL_BOOKINGS table
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "special_bookings_insert_all"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "special_bookings_select_all"
    ON special_bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "special_bookings_update"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        student_email = current_user
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

CREATE POLICY "special_bookings_delete_admin"
    ON special_bookings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

DROP TRIGGER IF EXISTS audit_special_bookings ON special_bookings;
CREATE TRIGGER audit_special_bookings
    AFTER INSERT OR UPDATE OR DELETE ON special_bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================
-- STEP 5: Fix FLEXIBLE_BOOKINGS table
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'flexible_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON flexible_bookings', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE flexible_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flexible_bookings_insert_all"
    ON flexible_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "flexible_bookings_select_all"
    ON flexible_bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "flexible_bookings_update"
    ON flexible_bookings
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = flexible_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

CREATE POLICY "flexible_bookings_delete_admin"
    ON flexible_bookings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

DROP TRIGGER IF EXISTS audit_flexible_bookings ON flexible_bookings;
CREATE TRIGGER audit_flexible_bookings
    AFTER INSERT OR UPDATE OR DELETE ON flexible_bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================
-- STEP 6: Verify all policies
-- ============================================
SELECT 'BOOKINGS policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'bookings';

SELECT 'SPECIAL_BOOKINGS policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'special_bookings';

SELECT 'FLEXIBLE_BOOKINGS policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'flexible_bookings';

SELECT 'AUDIT_LOG policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies WHERE tablename = 'audit_log';
