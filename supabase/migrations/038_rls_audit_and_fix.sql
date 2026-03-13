-- RLS Policy Audit and Fixes - REVISED
-- Based on analysis of all previous migrations
-- Run this to verify and fix RLS policies for production

-- ============================================
-- HELPER: Drop all policies on a table
-- ============================================
DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all policies on bookings
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON bookings', pol.policyname);
    END LOOP;
    
    -- Drop all policies on flexible_bookings
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'flexible_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON flexible_bookings', pol.policyname);
    END LOOP;
    
    -- Drop all policies on special_bookings
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'special_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON special_bookings', pol.policyname);
    END LOOP;
    
    -- Drop all policies on coaches
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'coaches'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON coaches', pol.policyname);
    END LOOP;
    
    -- Drop all policies on user_points
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_points'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_points', pol.policyname);
    END LOOP;
    
    -- Drop all policies on point_transactions
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'point_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON point_transactions', pol.policyname);
    END LOOP;
    
    -- Drop all policies on availability_slots
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'availability_slots'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON availability_slots', pol.policyname);
    END LOOP;
    
    -- Drop all policies on coach_blocked_dates
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'coach_blocked_dates'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON coach_blocked_dates', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================
ALTER TABLE IF EXISTS coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flexible_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS special_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coach_blocked_dates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. COACHES TABLE POLICIES
-- ============================================
-- Based on migrations: 011, 012
-- Uses SECURITY DEFINER function to avoid RLS recursion

-- Create function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coaches 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO anon;

-- Everyone can view coaches (needed for booking pages)
CREATE POLICY "Coaches are viewable by everyone"
    ON coaches
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admins can insert coaches
CREATE POLICY "Admins can insert coaches"
    ON coaches
    FOR INSERT
    TO authenticated
    WITH CHECK (is_current_user_admin());

-- Admins can update any coach, coaches can update own profile
CREATE POLICY "Admins and coaches can update"
    ON coaches
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR is_current_user_admin())
    WITH CHECK (user_id = auth.uid() OR is_current_user_admin());

-- Admins can delete coaches
CREATE POLICY "Admins can delete coaches"
    ON coaches
    FOR DELETE
    TO authenticated
    USING (is_current_user_admin());

-- ============================================
-- 3. BOOKINGS TABLE POLICIES (Monthly recurring)
-- ============================================
-- Based on migrations: 003

-- Anyone can create bookings (guest booking flow)
CREATE POLICY "Allow anonymous bookings"
    ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Anyone can view bookings (for conflict detection, filtered by email for privacy)
CREATE POLICY "Anyone can view bookings"
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
-- Based on migrations: 016, 018, 020, 022

-- Users can view their own bookings
CREATE POLICY "Users view own flexible bookings"
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

-- Anyone can view confirmed bookings (for conflict detection)
CREATE POLICY "Anyone view confirmed flexible bookings"
    ON flexible_bookings
    FOR SELECT
    TO anon, authenticated
    USING (
        status IN ('confirmed', 'completed', 'pending_payment', 'payment_received')
    );

-- Users can create their own bookings
CREATE POLICY "Users create own flexible bookings"
    ON flexible_bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. SPECIAL_BOOKINGS TABLE POLICIES
-- ============================================
-- Based on migrations: 015, 027, 028, 030

-- Users can view their own special bookings
CREATE POLICY "Users view own special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
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

-- Coaches can view their special bookings
CREATE POLICY "Coaches view their special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = special_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- Admins can view all special bookings
CREATE POLICY "Admins view all special bookings"
    ON special_bookings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Anyone can create special bookings (anonymous booking flow)
CREATE POLICY "Anyone can create special bookings"
    ON special_bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Users can update their own pending special bookings
CREATE POLICY "Users update own pending special bookings"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending_payment'
    )
    WITH CHECK (
        student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending_payment'
    );

-- Admins can update all special bookings
CREATE POLICY "Admins update all special bookings"
    ON special_bookings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- 6. USER_POINTS TABLE POLICIES
-- ============================================
-- Based on migrations: 016

-- Users can view their own points
CREATE POLICY "Users view own points"
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
-- 7. POINT_TRANSACTIONS TABLE POLICIES
-- ============================================
-- Based on migrations: 016, 018, 019, 020

-- Users can view their own transactions
CREATE POLICY "Users view own transactions"
    ON point_transactions
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

-- Users can create their own transactions
CREATE POLICY "Users create own transactions"
    ON point_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins full access transactions"
    ON point_transactions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- ============================================
-- 8. AVAILABILITY TABLE POLICIES
-- ============================================
-- Based on migrations: 003, 016

-- Anyone can view availability
CREATE POLICY "Anyone view availability"
    ON availability_slots
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Coaches can manage their own availability
CREATE POLICY "Coaches manage own availability"
    ON availability_slots
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = availability_slots.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- ============================================
-- 9. COACH_BLOCKED_DATES TABLE POLICIES
-- ============================================
-- Based on migrations: 016

-- Anyone can view blocked dates
CREATE POLICY "Anyone view blocked dates"
    ON coach_blocked_dates
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Coaches can manage their own blocked dates
CREATE POLICY "Coaches manage own blocked dates"
    ON coach_blocked_dates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

-- ============================================
-- 10. CREATE AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing audit log policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON audit_log', pol.policyname);
    END LOOP;
END $$;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================
-- 11. AUDIT LOG TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
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

COMMENT ON TABLE audit_log IS 'Audit trail for all booking and points transactions';

-- ============================================
-- COMPLETION STATUS
-- ============================================
SELECT 'RLS policies recreated successfully based on all previous migrations' as status;
