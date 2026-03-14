-- Bot Protection Migration
-- This migration adds protections against bot registrations

-- 1. Create a function to identify suspicious users
CREATE OR REPLACE FUNCTION identify_suspicious_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    reason TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        id as user_id,
        email,
        raw_user_meta_data->>'full_name' as full_name,
        created_at,
        CASE 
            -- Pattern: Random dots in email (e.g., ga.r.i.sir.a.6.4@gmail.com)
            WHEN email ~ '^([a-z]\.){4,}' THEN 'suspicious_dots_in_email'
            -- Pattern: Excessive dots in local part
            WHEN (LENGTH(email) - LENGTH(REPLACE(email, '.', ''))) > 5 THEN 'too_many_dots'
            -- Pattern: Name with excessive consonants
            WHEN raw_user_meta_data->>'full_name' ~* '[bcdfghjklmnpqrstvwxyz]{8,}' THEN 'suspicious_name_consonants'
            -- Pattern: Name with alternating caps
            WHEN raw_user_meta_data->>'full_name' ~ '[a-z][A-Z][a-z][A-Z]' THEN 'suspicious_name_caps'
            -- Pattern: Name too short
            WHEN LENGTH(COALESCE(raw_user_meta_data->>'full_name', '')) < 3 THEN 'name_too_short'
            -- Pattern: Name too long
            WHEN LENGTH(COALESCE(raw_user_meta_data->>'full_name', '')) > 30 THEN 'name_too_long'
            ELSE 'other'
        END as reason
    FROM auth.users
    WHERE 
        -- Match suspicious patterns
        (
            email ~ '^([a-z]\.){4,}'
            OR (LENGTH(email) - LENGTH(REPLACE(email, '.', ''))) > 5
            OR raw_user_meta_data->>'full_name' ~* '[bcdfghjklmnpqrstvwxyz]{8,}'
            OR raw_user_meta_data->>'full_name' ~ '[a-z][A-Z][a-z][A-Z]'
            OR LENGTH(COALESCE(raw_user_meta_data->>'full_name', '')) < 3
            OR LENGTH(COALESCE(raw_user_meta_data->>'full_name', '')) > 30
        )
        -- Exclude users who have made bookings (likely legitimate)
        AND NOT EXISTS (
            SELECT 1 FROM bookings WHERE student_email = auth.users.email
        )
        AND NOT EXISTS (
            SELECT 1 FROM flexible_bookings fb 
            WHERE fb.user_id = auth.users.id
        )
    ORDER BY created_at DESC;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION identify_suspicious_users() TO authenticated;

-- 2. Create a function to delete suspicious users (admin only)
CREATE OR REPLACE FUNCTION delete_suspicious_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the requesting user is an admin
    SELECT EXISTS (
        SELECT 1 FROM coaches 
        WHERE user_id = auth.uid() AND is_admin = true
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;
    
    -- Delete the user (this will cascade to related data due to foreign keys)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- 3. Add comment explaining the function
COMMENT ON FUNCTION identify_suspicious_users() IS 
'Identifies potentially bot-generated user accounts based on suspicious email and name patterns.
Run: SELECT * FROM identify_suspicious_users();
To clean up: SELECT delete_suspicious_user(user_id) FROM identify_suspicious_users();';

-- 4. Create a view for admin to see suspicious users easily
CREATE OR REPLACE VIEW admin_suspicious_users AS
SELECT * FROM identify_suspicious_users();

GRANT SELECT ON admin_suspicious_users TO authenticated;

-- 5. Add rate limiting tracking table (optional, for more robust rate limiting)
CREATE TABLE IF NOT EXISTS signup_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    email TEXT,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(ip_address)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON signup_rate_limits(ip_address);

-- Enable RLS
ALTER TABLE signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY "Admins can view rate limits"
    ON signup_rate_limits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Insert-only for anonymous (used by API)
CREATE POLICY "Allow insert for rate limiting"
    ON signup_rate_limits
    FOR INSERT
    WITH CHECK (true);

-- Update only by service role (used by API)
CREATE POLICY "Allow update for rate limiting"
    ON signup_rate_limits
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );
