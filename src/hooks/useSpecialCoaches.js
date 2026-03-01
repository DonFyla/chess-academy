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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
      
      try {
        // Get coach details
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', data.coach_id)
          .single()
        
        if (coachError) {
          console.error('Could not fetch coach details:', coachError)
          return
        }
        
        // Try multiple ways to get coach email
        let coachEmail = null
        
        // Method 1: Direct email column
        if (coach?.email) {
          coachEmail = coach.email
        }
        
        // Method 2: RPC to auth.users
        if (!coachEmail && coach?.user_id) {
          try {
            const { data: userData, error: rpcError } = await supabase
              .rpc('get_user_email', { user_id: coach.user_id })
            
            if (!rpcError && userData) {
              coachEmail = userData
            }
          } catch (e) {
            console.error('Could not get coach email via RPC:', e)
          }
        }
        
        const bookingWithCoach = { 
          ...data, 
          coach_name: coach?.name || 'Your Coach',
          meeting_link: coach?.meeting_link || null
        }
        
        // Email to student
        try {
          await sendSpecialBookingEmail({
            booking: bookingWithCoach,
            type: 'studentBookingReceived',
            recipient: data.student_email
          })
          console.log('✅ Special booking student email sent to:', data.student_email)
        } catch (studentEmailError) {
          console.error('❌ Failed to send student email:', studentEmailError)
        }
        
        // Email to coach (if coach has email)
        if (coachEmail) {
          try {
            await sendSpecialBookingEmail({
              booking: bookingWithCoach,
              type: 'coachNewBooking',
              recipient: coachEmail
            })
            console.log('✅ Special booking coach email sent to:', coachEmail)
          } catch (coachEmailError) {
            console.error('❌ Failed to send coach email:', coachEmailError)
          }
        } else {
          console.warn('⚠️ No coach email found for special booking')
        }
      } catch (emailError) {
        // Don't fail the booking if email fails
        console.error('Email error (non-critical):', emailError)
      }
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
