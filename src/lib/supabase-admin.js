// Admin Supabase Client - for server-side/admin operations
// This bypasses RLS using the service role key
// ONLY use this for admin operations, never in client-side code

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create admin client if service key is available (server-side)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Helper to check if admin client is available
export function isAdminClientAvailable() {
  return !!supabaseAdmin
}
