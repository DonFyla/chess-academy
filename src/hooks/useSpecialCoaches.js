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

// Send booking email helper
async function sendSpecialBookingEmail({ booking, type, recipient }) {
  const response = await fetch('/api/send-special-booking-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking, type, recipient }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Email sending failed:', error)
    throw new Error(error.message || 'Failed to send email')
  }
  
  return response.json()
}

// Create special session booking (uses API route to bypass RLS for guest bookings)
export function useCreateSpecialBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (booking) => {
      const response = await fetch('/api/special-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }
      
      return result.data
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['all-bookings-conflicts', data.coach_id] })
      // Note: Emails are sent server-side in the API route
    },
  })
}

// Confirm special booking payment - sends confirmation emails
export function useConfirmSpecialBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, paymentDetails }) => {
      const updateData = {
        status: 'confirmed',
        payment_method: paymentDetails?.payment_method || 'whatsapp_transfer',
        payment_reference: paymentDetails?.payment_reference || null,
        payment_date: new Date().toISOString(),
      }
      
      const { data, error } = await supabase
        .from('special_bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['special-bookings-all'] })
      
      console.log('💰 Special booking payment confirmed:', data.id)
      
      try {
        // Get coach details
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('name, email, meeting_link')
          .eq('id', data.coach_id)
          .single()
        
        if (coachError) {
          console.error('Could not fetch coach details:', coachError)
        }
        
        const bookingWithCoach = { 
          ...data, 
          coach_name: coach?.name || 'Your Coach',
          meeting_link: coach?.meeting_link || null
        }
        
        // Email to student - payment confirmed
        try {
          await sendSpecialBookingEmail({
            booking: bookingWithCoach,
            type: 'studentPaymentConfirmed',
            recipient: data.student_email
          })
          console.log('✅ Special booking payment confirmation email sent to student')
        } catch (e) {
          console.error('❌ Failed to send student confirmation email:', e)
        }
      } catch (emailError) {
        console.error('Payment confirmation email failed:', emailError)
      }
    },
  })
}

// Reject/cancel special booking
export function useRejectSpecialBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, adminNotes }) => {
      const { data, error } = await supabase
        .from('special_bookings')
        .update({ 
          status: 'cancelled',
          admin_notes: adminNotes 
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['special-bookings-all'] })
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
