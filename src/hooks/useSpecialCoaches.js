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

// Send booking email helper (non-blocking - errors are logged but don't break booking)
async function sendSpecialBookingEmail({ booking, type, recipient }) {
  try {
    const response = await fetch('/api/send-special-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, type, recipient }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Email sending failed:', error)
      // Don't throw - email failure shouldn't break booking
      return { success: false, error: error.message }
    }
    
    return response.json()
  } catch (error) {
    console.error('Email fetch error:', error)
    // Don't throw - email failure shouldn't break booking
    return { success: false, error: error.message }
  }
}

// Create special session booking (like normal booking - direct Supabase insert)
// NOTE: Requires RLS policy in Supabase to allow inserts for authenticated and anonymous users
export function useCreateSpecialBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (booking) => {
      const { data, error } = await supabase
        .from('special_bookings')
        .insert({
          coach_id: booking.coach_id,
          student_name: booking.student_name,
          student_email: booking.student_email,
          student_phone: booking.student_phone,
          total_sessions: booking.total_sessions,
          session_dates: booking.session_dates,
          is_recurring: booking.is_recurring || false,
          recurring_days: booking.recurring_days || [],
          hourly_rate: booking.hourly_rate,
          total_amount: booking.total_amount,
          status: 'pending_payment'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Special booking insert error:', error)
        throw error
      }
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['special-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['all-bookings-conflicts', data.coach_id] })
      // Invalidate unified schedule to refresh conflict detection
      queryClient.invalidateQueries({ queryKey: ['unified-schedule', data.coach_id] })
      
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
        
        // Get coach email from coaches table only
        // Note: RPC to auth.users removed due to permission issues
        const coachEmail = coach?.email || null
        
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
