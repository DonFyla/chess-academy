-- RLS Policy Audit and Fixes
-- Run this to verify and fix RLS policies for production

-- ============================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================

-- Enable RLS on all tables (idempotent - safe to run multiple times)
ALTER TABLE IF EXISTS coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flexible_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS special_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coach_blocked_dates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. COACHES TABLE POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view coaches" ON coaches;
DROP POLICY IF EXISTS "Admins can insert coaches" ON coaches;
DROP POLICY IF EXISTS "Admins can update coaches" ON coaches;
DROP POLICY IF EXISTS "Admins can delete coaches" ON coaches;

-- Allow anyone to view coaches (needed for booking pages)
CREATE POLICY "Anyone can view coaches"
    ON coaches
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only admins can modify coaches
CREATE POLICY "Admins can insert coaches"
    ON coaches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE user_id = auth.uid() 
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update coaches"
    ON coaches
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE user_id = auth.uid() 
            AND is_admin = true
        )
    );

-- ============================================
-- 3. BOOKINGS TABLE POLICIES (Monthly recurring)
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Coaches can view their assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON bookings;

-- Anyone can create bookings (guest booking flow)
CREATE POLICY "Anyone can create bookings"
    ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Users can view bookings by email (for non-logged in users)
CREATE POLICY "Users can view their own bookings"
    ON bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        student_email = current_user 
        OR 
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = bookings.coach_id 
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
-- 4. FLEXIBLE_BOOKINGS (Points) TABLE POLICIES
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "Coaches can view their own flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "Admins can view all flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "Anonymous users can view flexible bookings for conflict checking" ON flexible_bookings;
DROP POLICY IF EXISTS "Authenticated users can view flexible bookings for conflict checking" ON flexible_bookings;
DROP POLICY IF EXISTS "Anyone can view flexible bookings for conflict checking" ON flexible_bookings;
DROP POLICY IF EXISTS "Anyone can view confirmed flexible bookings" ON flexible_bookings;
DROP POLICY IF EXISTS "flexible_bookings_insert_policy" ON flexible_bookings;
DROP POLICY IF EXISTS "flexible_bookings_select_policy" ON flexible_bookings;
DROP POLICY IF EXISTS "flexible_bookings_update_policy" ON flexible_bookings;

-- Anyone can view confirmed bookings (for conflict detection)
CREATE POLICY "Anyone can view confirmed flexible bookings"
    ON flexible_bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        status IN ('confirmed', 'completed', 'pending_payment', 'payment_received')
    );

-- Users can view their own bookings (including pending)
CREATE POLICY "Users can view their own flexible bookings"
    ON flexible_bookings
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = flexible_bookings.coach_id 
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
-- 5. SPECIAL_BOOKINGS TABLE POLICIES
-- ============================================

-- Drop all possible variations of existing policies
DROP POLICY IF EXISTS "Anonymous users can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Anyone can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Anyone can view special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Admins can update special bookings" ON special_bookings;
DROP POLICY IF EXISTS "Authenticated users can create special bookings" ON special_bookings;
DROP POLICY IF EXISTS "special_bookings_insert_policy" ON special_bookings;
DROP POLICY IF EXISTS "special_bookings_select_policy" ON special_bookings;

-- Allow anonymous users to create special bookings
CREATE POLICY "Anyone can create special bookings"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Anyone can view special bookings (for conflict detection)
CREATE POLICY "Anyone can view special bookings"
    ON special_bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        status IN ('confirmed', 'payment_received', 'completed', 'pending_payment')
    );

-- ============================================
-- 6. USER_POINTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
DROP POLICY IF EXISTS "Admins can view all points" ON user_points;

CREATE POLICY "Users can view their own points"
    ON user_points
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- 7. AVAILABILITY TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view availability" ON availability;
DROP POLICY IF EXISTS "Coaches can manage their own availability" ON availability;

CREATE POLICY "Anyone can view availability"
    ON availability
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Coaches can manage their own availability"
    ON availability
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability.coach_id 
            AND coaches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- ============================================
-- 8. CREATE AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
CREATE POLICY "Admins can view audit logs"
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================
-- 9. AUDIT LOG TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
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
-- 10. SECURITY FUNCTIONS
-- ============================================

-- Function to get current IP address
CREATE OR REPLACE FUNCTION get_current_ip()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.headers', true)::json->>'x-forwarded-for';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE audit_log IS 'Audit trail for all booking and points transactions';
