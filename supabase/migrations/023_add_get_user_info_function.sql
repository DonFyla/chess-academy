-- Create function to get user info safely
-- This function bypasses RLS since it's executed as the service role

CREATE OR REPLACE FUNCTION get_user_info(user_ids UUID[])
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        COALESCE(
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            u.email::TEXT
        ) as full_name
    FROM auth.users u
    WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_info(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_info(UUID[]) TO anon;

-- Also create a single user version for convenience
CREATE OR REPLACE FUNCTION get_single_user_info(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        COALESCE(
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            u.email::TEXT
        ) as full_name
    FROM auth.users u
    WHERE u.id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_single_user_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_single_user_info(UUID) TO anon;
