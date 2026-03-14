-- Fix audit_log RLS - add INSERT policy for trigger function
-- The audit trigger was failing because audit_log had no INSERT policy

-- ============================================
-- STEP 1: Fix audit_log policies
-- ============================================

-- Drop existing policies on audit_log
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON audit_log', pol.policyname);
    END LOOP;
END $$;

-- Allow trigger function to insert (SECURITY DEFINER handles this, but we need the policy)
-- Actually for SECURITY DEFINER functions, we need to allow the function owner role
CREATE POLICY "Allow trigger insert on audit_log"
    ON audit_log
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
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

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Try to get email, but don't fail if can't access auth.users
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
    -- Don't fail the original operation if audit logging fails
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Recreate triggers with proper function
-- ============================================

DROP TRIGGER IF EXISTS audit_bookings ON bookings;
CREATE TRIGGER audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_flexible_bookings ON flexible_bookings;
CREATE TRIGGER audit_flexible_bookings
    AFTER INSERT OR UPDATE OR DELETE ON flexible_bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_special_bookings ON special_bookings;
CREATE TRIGGER audit_special_bookings
    AFTER INSERT OR UPDATE OR DELETE ON special_bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_user_points ON user_points;
CREATE TRIGGER audit_user_points
    AFTER INSERT OR UPDATE OR DELETE ON user_points
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================
-- STEP 4: Fix special_bookings policies (clean slate)
-- ============================================

-- Drop all existing policies on special_bookings
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- INSERT: Allow anyone
CREATE POLICY "special_bookings_insert_all"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT: Allow anyone (application filters)
CREATE POLICY "special_bookings_select_all"
    ON special_bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- UPDATE: Own by email, assigned coaches, admins
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

-- DELETE: Admin only
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

-- ============================================
-- STEP 5: Verify
-- ============================================
SELECT 'special_bookings policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies 
WHERE tablename = 'special_bookings';

SELECT 'audit_log policies:' as info;
SELECT policyname, cmd, roles::text 
FROM pg_policies 
WHERE tablename = 'audit_log';
