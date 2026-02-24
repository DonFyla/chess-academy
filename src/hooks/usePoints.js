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
      // Get current balance and total_used
      const { data: currentPoints, error: balanceError } = await supabase
        .from('user_points')
        .select('balance, total_used')
        .eq('user_id', userId)
        .single()
      
      if (balanceError) throw new Error('Could not fetch points balance')
      if (!currentPoints || currentPoints.balance < pointsUsed) {
        throw new Error('Insufficient points')
      }
      
      const newBalance = currentPoints.balance - pointsUsed
      const newTotalUsed = (currentPoints.total_used || 0) + pointsUsed
      
      // Start a transaction
      // 1. Deduct points
      const { error: deductError } = await supabase
        .from('user_points')
        .update({ 
          balance: newBalance,
          total_used: newTotalUsed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (deductError) throw deductError
      
      // 2. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('flexible_bookings')
        .insert({
          user_id: userId,
          coach_id: coachId,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          day_of_week: dayOfWeek,
          points_used: pointsUsed,
          status: 'confirmed',
          meeting_link: meetingLink,
        })
        .select()
        .single()
      
      if (bookingError) throw bookingError
      
      // 3. Create transaction record
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'usage',
          amount: -pointsUsed,
          balance_after: newBalance,
          booking_id: booking.id,
          description: `Booked class with coach ${coachId}`,
        })
      
      if (txError) throw txError
      
      return booking
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
      // Get booking details with coach info
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
      if (booking.status === 'cancelled') throw new Error('Already cancelled')
      
      // Check if within 24 hours
      const sessionDateTime = new Date(`${booking.session_date}T${booking.start_time}`)
      const now = new Date()
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60)
      
      if (hoursUntilSession < 24) {
        throw new Error('Cannot cancel less than 24 hours before session')
      }
      
      // Get current balance
      const { data: currentPoints, error: balanceError } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', userId)
        .single()
      
      if (balanceError) throw new Error('Could not fetch points balance')
      
      const refundAmount = booking.points_used
      const newBalance = currentPoints.balance + refundAmount
      
      // 1. Update booking status
      const { error: updateError } = await supabase
        .from('flexible_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund_processed: true,
        })
        .eq('id', bookingId)
      
      if (updateError) throw updateError
      
      // 2. Refund points
      const { error: refundError } = await supabase
        .from('user_points')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (refundError) throw refundError
      
      // 3. Create refund transaction
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'refund',
          amount: refundAmount,
          balance_after: newBalance,
          booking_id: bookingId,
          description: `Refund for cancelled booking`,
        })
      
      if (txError) throw txError
      
      // 4. Send refund email
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
              refund_amount: refundAmount,
              new_balance: newBalance,
            }
          })
        })
      } catch (e) {
        console.error('Failed to send refund email:', e)
      }
      
      return { success: true, refunded: refundAmount, newBalance }
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
