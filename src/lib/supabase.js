import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate URL format
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

// Ensure URL is properly formatted
try {
  new URL(supabaseUrl)
} catch (e) {
  console.error('Invalid Supabase URL:', supabaseUrl)
  throw new Error('Invalid Supabase URL format')
}

// Create client with cookie persistence for auth
export const supabase = createClient(supabaseUrl, supabaseKey, {
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
