'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch bookings for a specific coach
export function useCoachBookings(coachId) {
  return useQuery({
    queryKey: ['bookings', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('coach_id', coachId)
        .order('booking_date')
        .order('start_time')
      
      if (error) throw error
      return data
    },
    enabled: !!coachId,
  })
}

// Fetch all bookings (admin only)
export function useAllBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, coaches(name)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })
}

// Create booking
export function useCreateBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (booking) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...booking, status: 'pending' })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// Update booking status (confirm/reject)
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      
      // Send email notification
      if (data.status === 'confirmed' || data.status === 'rejected') {
        sendBookingNotification(data)
      }
    },
  })
}

// Send booking notification email
async function sendBookingNotification(booking) {
  try {
    await fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking }),
    })
  } catch (error) {
    console.error('Failed to send email notification:', error)
  }
}

// Cancel booking
export function useCancelBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, coachId }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
