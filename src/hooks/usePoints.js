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

// Fetch all coaches available for points booking (excludes special/elite coaches)
export function usePointsCoaches() {
  return useQuery({
    queryKey: ['points-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_special', false)
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
          coaches(name, email)
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
      
      // Send refund email to student
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
      
      // Send cancellation notification to coach
      if (booking.coaches?.email) {
        try {
          await fetch('/api/points-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'coachCancellationNotification',
              data: {
                student_name: userName || 'Student',
                coach_name: booking.coaches?.name || 'Coach',
                coach_email: booking.coaches?.email,
                session_date: booking.session_date,
                start_time: booking.start_time,
                end_time: booking.end_time,
              }
            })
          })
        } catch (e) {
          console.error('Failed to send coach cancellation email:', e)
        }
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
      console.log('Fetching all flexible bookings...')
      
      // Try with coaches join first
      const { data, error } = await supabase
        .from('flexible_bookings')
        .select(`
          *,
          coaches(name, email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('useAllFlexibleBookings error:', error)
        
        // Fallback: try without the join
        console.log('Trying fallback without coaches join...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('flexible_bookings')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (fallbackError) {
          console.error('Fallback error:', fallbackError)
          throw fallbackError
        }
        
        console.log('Fallback success:', fallbackData?.length || 0, 'bookings')
        return fallbackData || []
      }
      
      console.log('Flexible bookings fetched:', data?.length || 0, 'bookings')
      return data || []
    },
  })
}

// Fetch existing confirmed bookings for a coach (to prevent double-booking)
// UPDATED: Now uses unified schedule to check across ALL booking types
export function useCoachBookingsForPoints(coachId) {
  return useQuery({
    queryKey: ['coach-bookings-points', coachId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      // Try unified schedule first
      const { data, error } = await supabase
        .rpc('get_coach_unified_schedule', {
          p_coach_id: coachId,
          p_start_date: today,
          p_days_ahead: 365
        })
      
      console.log('[useCoachBookingsForPoints] RPC result:', { dataLength: data?.length, error })
      
      if (error) {
        console.error('[useCoachBookingsForPoints] RPC error:', error)
        // Fallback: Fetch both flexible bookings AND monthly bookings
        const [flexibleResult, monthlyResult] = await Promise.all([
          // Point-based bookings
          supabase
            .from('flexible_bookings')
            .select('session_date, start_time, end_time, status')
            .eq('coach_id', coachId)
            .in('status', ['confirmed', 'completed'])
            .gte('session_date', today),
          
          // Monthly recurring bookings
          supabase
            .from('bookings')
            .select('recurring_days, start_time, end_time, status, recurring_dates, booking_date')
            .eq('coach_id', coachId)
            .not('status', 'in', '(rejected,cancelled)')
        ])
        
        if (flexibleResult.error) throw flexibleResult.error
        
        // Convert monthly bookings to the expected format
        const monthlyBookings = (monthlyResult.data || []).flatMap(b => {
          // If has recurring_dates array, expand it
          if (b.recurring_dates && Array.isArray(b.recurring_dates) && b.recurring_dates.length > 0) {
            return b.recurring_dates
              .filter(d => new Date(d.date) >= new Date(today))
              .map(d => ({
                session_date: d.date,
                start_time: d.start_time || b.start_time,
                end_time: d.end_time || b.end_time,
                status: b.status,
                booking_type: 'monthly',
                student_name: 'Monthly Student'
              }))
          }
          
          // Fallback: generate from recurring_days if no recurring_dates
          if (b.recurring_days && Array.isArray(b.recurring_days) && b.recurring_days.length > 0) {
            const sessions = []
            const bookingStart = new Date(b.booking_date)
            
            // Generate next 4 weeks of dates
            for (let week = 0; week < 4; week++) {
              const weekStart = new Date(bookingStart)
              weekStart.setDate(bookingStart.getDate() + (week * 7))
              
              b.recurring_days.forEach(dayOfWeek => {
                const date = new Date(weekStart)
                const currentDay = date.getDay()
                const diff = dayOfWeek - currentDay
                date.setDate(date.getDate() + diff)
                
                const dateStr = date.toISOString().split('T')[0]
                if (dateStr >= today) {
                  sessions.push({
                    session_date: dateStr,
                    start_time: b.start_time,
                    end_time: b.end_time,
                    status: b.status,
                    booking_type: 'monthly',
                    student_name: 'Monthly Student'
                  })
                }
              })
            }
            return sessions
          }
          
          return []
        })
        
        const flexibleBookings = (flexibleResult.data || []).map(b => ({
          ...b,
          booking_type: 'points'
        }))
        
        return [...monthlyBookings, ...flexibleBookings]
      }
      
      // Map unified schedule format to the expected format
      const mapped = (data || []).map(booking => ({
        session_date: booking.session_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        booking_type: booking.booking_type,
        student_name: booking.student_name
      }))
      console.log('[useCoachBookingsForPoints] Mapped bookings:', mapped.length, 'Monthly:', mapped.filter(b => b.booking_type === 'monthly').length)
      return mapped
    },
    enabled: !!coachId,
  })
}

// Fetch coach's flexible bookings with student details
export function useCoachFlexibleBookings(coachId) {
  return useQuery({
    queryKey: ['coach-flexible-bookings', coachId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      // Step 1: Get bookings without user join (RLS blocks auth.users access)
      const { data: bookings, error } = await supabase
        .from('flexible_bookings')
        .select('*')
        .eq('coach_id', coachId)
        .in('status', ['confirmed', 'completed'])
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (error) throw error
      if (!bookings || bookings.length === 0) return []
      
      // Step 2: Get unique user IDs from bookings
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))]
      
      // Step 3: Fetch user details using the database function
      let userMap = {}
      if (userIds.length > 0) {
        try {
          const { data: userData, error: userError } = await supabase
            .rpc('get_user_info', { user_ids: userIds })
          
          if (!userError && userData) {
            userData.forEach(user => {
              userMap[user.id] = user
            })
          }
        } catch (e) {
          console.error('Error fetching user info:', e)
        }
      }
      
      // Step 4: Merge user data with bookings
      return bookings.map(booking => ({
        ...booking,
        users: userMap[booking.user_id] || null
      }))
    },
    enabled: !!coachId,
  })
}
