'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Auth session error:', error.message)
          setAuthError(error.message)
          setLoading(false)
          return
        }
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchCoach(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to get session:', err.message)
        setAuthError(err.message)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCoach(session.user.id)
      } else {
        setCoach(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCoach(userId) {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        // PGRST116 = no rows returned (user is not a coach) - this is expected
        if (error.code !== 'PGRST116') {
          console.error('Error fetching coach:', error.message || error)
        }
      }
      
      setCoach(data || null)
    } catch (error) {
      console.error('Exception fetching coach:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }
  
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Session refresh failed:', error.message)
        return null
      }
      return data.session
    } catch (err) {
      console.error('Session refresh error:', err.message)
      return null
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setCoach(null)
    }
    return { error }
  }

  const isAdmin = () => coach?.is_admin || false
  const isCoach = () => coach !== null

  const value = {
    user,
    coach,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    refreshSession,
    isAdmin,
    isCoach
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
