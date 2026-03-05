'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Check if a specific slot is available across ALL booking types
export function useSlotAvailability(coachId, date, startTime, endTime) {
  return useQuery({
    queryKey: ['slot-availability', coachId, date, startTime, endTime],
    queryFn: async () => {
      if (!coachId || !date || !startTime || !endTime) return false
      
      const { data, error } = await supabase
        .rpc('is_slot_available', {
          p_coach_id: coachId,
          p_date: date,
          p_start_time: startTime,
          p_end_time: endTime
        })
      
      if (error) {
        console.error('Slot availability check failed:', error)
        return false
      }
      
      return data === true
    },
    enabled: !!coachId && !!date && !!startTime && !!endTime,
  })
}

// Get unified schedule for a coach across all booking types
export function useUnifiedSchedule(coachId, daysAhead = 90) {
  return useQuery({
    queryKey: ['unified-schedule', coachId, daysAhead],
    queryFn: async () => {
      if (!coachId) return []
      
      // Try the RPC first
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .rpc('get_coach_unified_schedule', {
          p_coach_id: coachId,
          p_start_date: today,
          p_days_ahead: daysAhead
        })
      
      if (error) {
        // Fallback: Fetch manually if RPC fails
        
        const [monthlyResult, pointsResult] = await Promise.all([
          // Monthly bookings
          supabase
            .from('bookings')
            .select('id, student_name, student_email, start_time, end_time, status, recurring_dates, recurring_days')
            .eq('coach_id', coachId)
            .not('status', 'in', '(rejected,cancelled)'),
          
          // Point bookings
          supabase
            .from('flexible_bookings')
            .select('id, session_date, start_time, end_time, status, user_id, points_used')
            .eq('coach_id', coachId)
            .in('status', ['confirmed', 'completed'])
            .gte('session_date', today)
        ])
        

        
        // Convert monthly bookings to unified format
        const monthlyBookings = (monthlyResult.data || []).flatMap(b => {
          if (!b.recurring_dates || !Array.isArray(b.recurring_dates)) {
            // Fallback: generate from recurring_days
            if (!b.recurring_days || b.recurring_days.length === 0) return []
            
            // Generate next 4 weeks of dates
            const bookings = []
            const today = new Date()
            for (let week = 0; week < 4; week++) {
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() + (week * 7))
              
              b.recurring_days.forEach(dayOfWeek => {
                const date = new Date(weekStart)
                const currentDay = date.getDay()
                const diff = dayOfWeek - currentDay
                date.setDate(date.getDate() + diff)
                
                if (date >= today) {
                  bookings.push({
                    booking_id: b.id,
                    booking_type: 'monthly',
                    session_date: date.toISOString().split('T')[0],
                    start_time: b.start_time,
                    end_time: b.end_time,
                    student_name: b.student_name,
                    student_email: b.student_email,
                    status: b.status
                  })
                }
              })
            }
            return bookings
          }
          
          return b.recurring_dates
            .filter(d => new Date(d.date) >= new Date(today))
            .map(d => ({
              booking_id: b.id,
              booking_type: 'monthly',
              session_date: d.date,
              start_time: d.start_time || b.start_time,
              end_time: d.end_time || b.end_time,
              student_name: b.student_name,
              student_email: b.student_email,
              status: b.status
            }))
        })
        
        // Convert point bookings
        const pointBookings = (pointsResult.data || []).map(b => ({
          booking_id: b.id,
          booking_type: 'points',
          session_date: b.session_date,
          start_time: b.start_time,
          end_time: b.end_time,
          student_name: b.user_id ? 'Point Student' : 'Unknown',
          student_email: null,
          status: b.status
        }))
        
        const combined = [...monthlyBookings, ...pointBookings]
          .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
        
        return combined
      }
      
      return data || []
    },
    enabled: !!coachId,
  })
}

// Get available slots for a specific date
export function useAvailableSlotsForDate(coachId, date) {
  return useQuery({
    queryKey: ['available-slots', coachId, date],
    queryFn: async () => {
      if (!coachId || !date) return []
      
      const { data, error } = await supabase
        .rpc('get_available_slots_for_date', {
          p_coach_id: coachId,
          p_date: date
        })
      
      if (error) {
        throw error
      }
      
      return data || []
    },
    enabled: !!coachId && !!date,
  })
}

// Check for conflicts across all booking types (for use in forms)
export async function checkSlotConflict(coachId, date, startTime, endTime) {
  if (!coachId || !date || !startTime || !endTime) {
    return { available: false, error: 'Missing parameters' }
  }
  
  try {
    const { data, error } = await supabase
      .rpc('is_slot_available', {
        p_coach_id: coachId,
        p_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      })
    
    if (error) {
      return { available: false, error: error.message }
    }
    
    return { available: data === true, error: null }
  } catch (err) {
    console.error('Unexpected error checking slot:', err)
    return { available: false, error: err.message }
  }
}
