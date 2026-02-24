'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch user's points balance
export function useUserPoints(userId) {
  return useQuery({
    queryKey: ['user-points', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
      return data || { balance: 0, total_purchased: 0, total_used: 0 }
    },
    enabled: !!userId,
  })
}

// Fetch user's point transactions
export function usePointTransactions(userId) {
  return useQuery({
    queryKey: ['point-transactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

// Fetch all coaches available for points booking
export function usePointsCoaches() {
  return useQuery({
    queryKey: ['points-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('points_cost', { ascending: true })
        .order('name')
      
      if (error) throw error
      return data
    },
  })
}

// Purchase points (admin only - creates points for user)
export function usePurchasePoints() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, amount, paymentReference, description }) => {
      // Get current balance
      const { data: currentPoints } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      const newBalance = (currentPoints?.balance || 0) + amount
      const newTotalPurchased = (currentPoints?.total_purchased || 0) + amount
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      
      // Upsert user_points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .upsert({
          user_id: userId,
          balance: newBalance,
          total_purchased: newTotalPurchased,
          total_used: currentPoints?.total_used || 0,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single()
      
      if (pointsError) throw pointsError
      
      // Create transaction record
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'purchase',
          amount: amount,
          balance_after: newBalance,
          payment_reference: paymentReference,
          description: description || `Purchased ${amount} points`,
          expires_at: expiresAt,
        })
      
      if (txError) throw txError
      
      return pointsData
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-points', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['point-transactions', variables.userId] })
    },
  })
}

// Create flexible booking using points
export function useCreateFlexibleBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, coachId, sessionDate, startTime, endTime, dayOfWeek, pointsUsed, meetingLink }) => {
      // Use atomic database function that handles all operations in one transaction
      const { data, error } = await supabase
        .rpc('book_class_with_points', {
          p_user_id: userId,
          p_coach_id: coachId,
          p_session_date: sessionDate,
          p_start_time: startTime,
          p_end_time: endTime,
          p_day_of_week: dayOfWeek,
          p_points_used: pointsUsed,
          p_meeting_link: meetingLink
        })
      
      if (error) {
        // Check for specific error messages from the function
        if (error.message.includes('Insufficient points')) {
          throw new Error(`Insufficient points: ${error.message}`)
        }
        if (error.message.includes('No points balance')) {
          throw new Error('You need to purchase points first')
        }
        throw new Error(error.message)
      }
      
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-points', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['point-transactions', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['flexible-bookings', variables.userId] })
    },
  })
}

// Cancel flexible booking and refund points
export function useCancelFlexibleBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ bookingId, userId, userEmail, userName, coachName }) => {
      // Get booking details for email (before cancelling)
      const { data: booking, error: bookingError } = await supabase
        .from('flexible_bookings')
        .select(`
          *,
          coaches(name)
        `)
        .eq('id', bookingId)
        .eq('user_id', userId)
        .single()
      
      if (bookingError) throw new Error('Booking not found')
      
      // Use atomic database function for cancellation
      const { data, error } = await supabase
        .rpc('cancel_booking_and_refund', {
          p_booking_id: bookingId,
          p_user_id: userId
        })
      
      if (error) {
        if (error.message.includes('less than 24 hours')) {
          throw new Error('Cannot cancel less than 24 hours before session')
        }
        if (error.message.includes('already cancelled')) {
          throw new Error('Booking already cancelled')
        }
        throw new Error(error.message)
      }
      
      // Send refund email
      try {
        await fetch('/api/points-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pointsRefundNotification',
            data: {
              student_name: userName || 'Student',
              student_email: userEmail,
              coach_name: coachName || booking.coaches?.name || 'Coach',
              session_date: booking.session_date,
              start_time: booking.start_time,
              end_time: booking.end_time,
              refund_amount: data.refund_amount,
              new_balance: data.new_balance,
            }
          })
        })
      } catch (e) {
        console.error('Failed to send refund email:', e)
      }
      
      return { success: true, refunded: data.refund_amount, newBalance: data.new_balance }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-points', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['point-transactions', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['flexible-bookings', variables.userId] })
    },
  })
}

// Fetch user's flexible bookings
export function useFlexibleBookings(userId) {
  return useQuery({
    queryKey: ['flexible-bookings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flexible_bookings')
        .select(`
          *,
          coaches(name, email, meeting_link, points_cost)
        `)
        .eq('user_id', userId)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Admin: Get all flexible bookings
export function useAllFlexibleBookings() {
  return useQuery({
    queryKey: ['flexible-bookings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flexible_bookings')
        .select(`
          *,
          coaches(name, email),
          users:student_id(email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })
}

// Fetch existing confirmed bookings for a coach (to prevent double-booking)
export function useCoachBookingsForPoints(coachId) {
  return useQuery({
    queryKey: ['coach-bookings-points', coachId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('flexible_bookings')
        .select('session_date, start_time, end_time, status')
        .eq('coach_id', coachId)
        .in('status', ['confirmed', 'completed'])
        .gte('session_date', today)
      
      if (error) throw error
      return data || []
    },
    enabled: !!coachId,
  })
}
