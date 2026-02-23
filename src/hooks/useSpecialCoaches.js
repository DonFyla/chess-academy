'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch all special coaches (high-ranked)
export function useSpecialCoaches() {
  return useQuery({
    queryKey: ['special-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_special', true)
        .order('featured_order', { ascending: true })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })
}

// Fetch single special coach
export function useSpecialCoach(coachId) {
  return useQuery({
    queryKey: ['special-coaches', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', coachId)
        .eq('is_special', true)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!coachId,
  })
}

// Create special session booking
export function useCreateSpecialBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (booking) => {
      const { data, error } = await supabase
        .from('special_bookings')
        .insert(booking)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
    },
  })
}

// Fetch user's special bookings
export function useUserSpecialBookings(userId) {
  return useQuery({
    queryKey: ['special-bookings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_bookings')
        .select(`
          *,
          coaches(name, email, meeting_link)
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Admin: Get all special bookings
export function useAllSpecialBookings() {
  return useQuery({
    queryKey: ['special-bookings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_bookings')
        .select(`
          *,
          coaches(name, email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })
}
