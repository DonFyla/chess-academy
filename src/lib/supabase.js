import { createClient } from '@supabase/supabase-js'

// Lazy initialization - only create client when needed
let supabaseInstance = null

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time on Vercel, these might not be available
  // Return a mock client that will be replaced at runtime
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not available - using placeholder')
    // Return a minimal mock for build time
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        signInWithPassword: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      rpc: () => Promise.resolve({ data: [], error: null }),
    }
  }

  // Ensure URL is properly formatted
  try {
    new URL(supabaseUrl)
  } catch (e) {
    console.error('Invalid Supabase URL:', supabaseUrl)
    throw new Error('Invalid Supabase URL format')
  }

  // Create client with cookie persistence for auth
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? {
        getItem: (key) => {
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
            ?.split('=')[1]
          return value ? decodeURIComponent(value) : null
        },
        setItem: (key, value) => {
          document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax` // 30 days
        },
        removeItem: (key) => {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      } : undefined,
    },
  })

  return supabaseInstance
}

// Export a proxy that creates the client on first use
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseClient()
    return client[prop]
  }
})

// Helper function to get current user
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.log('No user logged in')
      return null
    }
    return user
  } catch (error) {
    console.log('Error getting user:', error.message)
    return null
  }
}

// Helper function to get current coach
export async function getCurrentCoach() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('No user logged in, cannot get coach')
      return null
    }
    
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No coach found for this user')
        return null
      }
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error getting coach:', error.message)
    return null
  }
}

// Helper to check if user is admin
export async function isAdmin() {
  const coach = await getCurrentCoach()
  return coach?.is_admin || false
}
