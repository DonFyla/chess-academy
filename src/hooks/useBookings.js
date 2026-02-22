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
      // First get all bookings with coach names
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, coaches(name, user_id)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Get coach emails from user accounts
      const bookingsWithEmails = await Promise.all(
        bookings.map(async (booking) => {
          if (booking.coaches?.user_id) {
            const { data: email } = await supabase
              .rpc('get_user_email', { user_id: booking.coaches.user_id })
            return { ...booking, coach_email: email }
          }
          return booking
        })
      )
      
      return bookingsWithEmails
    },
  })
}

// Create booking - sends emails to student and coach
export function useCreateBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (booking) => {
      // Prepare the booking data
      const bookingData = {
        coach_id: booking.coach_id,
        student_name: booking.student_name,
        student_email: booking.student_email,
        student_phone: booking.student_phone,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        recurring_days: booking.recurring_days,
        recurring_dates: booking.recurring_dates,
        monthly_amount: booking.monthly_amount,
        sessions_per_month: booking.sessions_per_month,
        booking_mode: booking.booking_mode,
        notes: booking.notes,
        course_type: booking.course_type,
        status: 'pending_payment'
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()
      
      if (error) {
        console.error('Booking insert error:', error)
        throw error
      }
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      
      try {
        // Get coach details - try all possible columns
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', data.coach_id)
          .single()
        
        if (coachError) {
          console.error('Could not fetch coach details:', coachError)
          return
        }
        
        console.log('Coach data retrieved:', coach)
        console.log('Coach ID:', data.coach_id)
        console.log('Coach user_id:', coach?.user_id)
        console.log('Coach email column:', coach?.email)
        
        // Try multiple ways to get coach email
        let coachEmail = null
        
        // Method 1: Direct email column
        if (coach?.email) {
          coachEmail = coach.email
          console.log('Found coach email in email column:', coachEmail)
        }
        
        // Method 2: RPC to auth.users
        if (!coachEmail && coach?.user_id) {
          try {
            console.log('Trying RPC get_user_email for user_id:', coach.user_id)
            const { data: userData, error: rpcError } = await supabase
              .rpc('get_user_email', { user_id: coach.user_id })
            
            if (rpcError) {
              console.error('RPC get_user_email error:', rpcError)
            } else if (userData) {
              coachEmail = userData
              console.log('Got coach email from RPC:', coachEmail)
            }
          } catch (e) {
            console.error('Could not get coach email via RPC:', e)
          }
        }
        
        // Method 3: Try querying auth.users directly (if permissions allow)
        if (!coachEmail && coach?.user_id) {
          try {
            console.log('Trying direct auth query...')
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email')
              .eq('id', coach.user_id)
              .single()
            
            if (!userError && userData?.email) {
              coachEmail = userData.email
              console.log('Got coach email from users table:', coachEmail)
            }
          } catch (e) {
            console.log('Direct auth query failed:', e.message)
          }
        }
        
        // Send emails
        const bookingWithCoach = { 
          ...data, 
          coach_name: coach?.name || 'Your Coach',
          meeting_link: coach?.meeting_link || null
        }
        
        // Email to student
        try {
          await sendBookingEmail({
            booking: bookingWithCoach,
            type: 'studentBookingReceived',
            recipient: data.student_email
          })
          console.log('✅ Student email sent to:', data.student_email)
        } catch (studentEmailError) {
          console.error('❌ Failed to send student email:', studentEmailError)
        }
        
        // Email to coach (if coach has email)
        if (coachEmail) {
          console.log('📧 Sending coach email to:', coachEmail)
          try {
            await sendBookingEmail({
              booking: bookingWithCoach,
              type: 'coachNewBooking',
              recipient: coachEmail
            })
            console.log('✅ Coach email sent successfully to:', coachEmail)
          } catch (coachEmailError) {
            console.error('❌ Failed to send coach email:', coachEmailError)
          }
        } else {
          console.warn('⚠️ No coach email found - coach will not receive notification')
          console.warn('To fix this, either:')
          console.warn('  1. Add an "email" column to the coaches table and set the email value')
          console.warn('  2. Link the coach to a user account via user_id')
        }
      } catch (emailError) {
        // Don't fail the booking if email fails
        console.error('Email sending failed:', emailError)
      }
    },
  })
}

// Confirm payment and booking - sends payment confirmation emails
export function useConfirmPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, paymentDetails }) => {
      const updateData = {
        status: 'confirmed',
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        ...paymentDetails
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      
      console.log('💰 Payment confirmed for booking:', data.id)
      console.log('Coach ID:', data.coach_id)
      
      try {
        // Get coach details including user email and meeting link
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('name, user_id, email, meeting_link')
          .eq('id', data.coach_id)
          .single()
        
        console.log('Coach lookup result:', { coach, coachError })
        
        if (coachError) {
          console.error('Could not fetch coach details:', coachError)
        }
        
        // Get coach email (from email column or via RPC)
        let coachEmail = coach?.email || null
        console.log('Coach email from column:', coachEmail)
        
        if (!coachEmail && coach?.user_id) {
          console.log('Trying RPC lookup for user_id:', coach.user_id)
          try {
            const { data: userData } = await supabase
              .rpc('get_user_email', { user_id: coach.user_id })
            if (userData) {
              coachEmail = userData
              console.log('Got coach email from RPC:', coachEmail)
            }
          } catch (e) {
            console.log('Could not get coach email via RPC:', e)
          }
        }
        
        const bookingWithCoach = { ...data, coach_name: coach?.name || 'Your Coach' }
        console.log('Booking with coach name:', bookingWithCoach.coach_name)
        
        // Email to student - payment confirmed
        try {
          console.log('Sending student email to:', data.student_email)
          await sendBookingEmail({
            booking: bookingWithCoach,
            type: 'studentBookingConfirmed',
            recipient: data.student_email
          })
          console.log('✅ Student payment confirmation email sent')
        } catch (e) {
          console.error('❌ Failed to send student email:', e)
        }
        
        // Email to coach - payment confirmed
        console.log('Coach email for payment confirmation:', coachEmail)
        if (coachEmail) {
          console.log('Sending coach payment confirmation email to:', coachEmail)
          try {
            const result = await sendBookingEmail({
              booking: bookingWithCoach,
              type: 'coachBookingConfirmed',
              recipient: coachEmail
            })
            console.log('✅ Coach payment confirmation email result:', result)
          } catch (e) {
            console.error('❌ Failed to send coach email:', e)
          }
        } else {
          console.warn('⚠️ No coach email found for payment confirmation')
          console.warn('Coach data:', coach)
        }
      } catch (emailError) {
        console.error('Payment confirmation email failed:', emailError)
      }
    },
  })
}

// Reject booking
export function useRejectBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, adminNotes }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'rejected',
          admin_notes: adminNotes 
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.coach_id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      
      // Email to student - booking rejected
      sendBookingEmail({
        booking: data,
        type: 'studentBookingRejected',
        recipient: data.student_email
      })
    },
  })
}

// Legacy: Update booking status (for backwards compatibility)
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
    },
  })
}

// Cancel booking
export function useCancelBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id }) => {
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

// Helper function to send booking emails
async function sendBookingEmail({ booking, type, recipient }) {
  try {
    console.log(`📤 Sending ${type} email to ${recipient}...`)
    console.log(`📤 Booking ID: ${booking?.id}, Coach: ${booking?.coach_name}`)
    
    const res = await fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, type, recipient }),
    })
    
    const data = await res.json()
    console.log(`📤 API response for ${type}:`, data)
    
    if (!res.ok) {
      console.error('❌ Failed to send email:', data.error)
      return false
    }
    
    console.log(`✅ Email sent successfully: ${type} to ${recipient}`)
    return true
  } catch (error) {
    console.error('❌ Error sending email:', error)
    return false
  }
}
