import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('API: /api/admin/users called')
  
  try {
    // In Next.js 15, cookies() returns a Promise
    const cookieStore = await cookies()
    console.log('API: Got cookie store')
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            try {
              const cookie = cookieStore.get(name)
              return cookie?.value
            } catch (e) {
              return undefined
            }
          },
          set: () => {},
          remove: () => {},
        },
      }
    )
    console.log('API: Created supabase client')
    
    // Check if user is logged in
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('API: Session check:', session ? 'has session' : 'no session', 'Error:', sessionError?.message)
    
    if (sessionError) {
      return NextResponse.json({ error: 'Session error', details: sessionError.message }, { status: 401 })
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    // Check admin status
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('is_admin, name')
      .eq('user_id', session.user.id)
      .single()
    
    console.log('API: Coach lookup:', coach ? 'found' : 'not found', 'Error:', coachError?.message)
    
    if (coachError) {
      return NextResponse.json({ error: 'Coach lookup failed', details: coachError.message }, { status: 500 })
    }
    
    if (!coach?.is_admin) {
      return NextResponse.json({ error: 'Admin access required', isAdmin: false }, { status: 403 })
    }
    
    // Try to get users - first try RPC, then fallback to direct query
    console.log('API: Trying to fetch users')
    
    // Method 1: Try RPC function
    let { data: users, error: rpcError } = await supabase.rpc('get_all_users')
    
    if (rpcError) {
      console.log('API: RPC failed, trying direct query:', rpcError.message)
      
      // Method 2: Try direct query to auth.users (requires service role)
      const { data: directUsers, error: directError } = await supabase
        .from('users')
        .select('id, email, created_at, raw_user_meta_data')
        .order('created_at', { ascending: false })
      
      if (directError) {
        console.log('API: Direct query failed:', directError.message)
        
        // Method 3: Return mock data for now
        return NextResponse.json({ 
          users: [],
          warning: 'Could not fetch users from database. Please run the migration in Supabase.',
          rpcError: rpcError.message,
          directError: directError.message
        }, { status: 200 })
      }
      
      // Transform the data to match expected format
      users = directUsers?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.raw_user_meta_data
      })) || []
    } else {
      // Transform RPC result if needed
      users = users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.raw_user_meta_data || u.user_metadata
      })) || []
    }
    
    console.log('API: Success, returning', users.length, 'users')
    return NextResponse.json({ users })
    
  } catch (error) {
    console.error('API: Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
