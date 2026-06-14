'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch blocked dates for a coach
export function useCoachBlockedDates(coachId) {
  return useQuery({
    queryKey: ['coach-blocked-dates', coachId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('coach_blocked_dates')
        .select('*')
        .eq('coach_id', coachId)
        .gte('blocked_date', today)  // Only future blocks
        .order('blocked_date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!coachId,
  })
}

// Block a date/time for coach
export function useBlockCoachDate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ coachId, blockedDate, startTime, endTime, reason }) => {
      const { data, error } = await supabase
        .from('coach_blocked_dates')
        .insert({
          coach_id: coachId,
          blocked_date: blockedDate,
          start_time: startTime || null,  // null = entire day
          end_time: endTime || null,      // null = entire day
          reason: reason || null,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coach-blocked-dates', variables.coachId] })
    },
  })
}

// Unblock a date for coach
export function useUnblockCoachDate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ blockId, coachId }) => {
      const { error } = await supabase
        .from('coach_blocked_dates')
        .delete()
        .eq('id', blockId)
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coach-blocked-dates', variables.coachId] })
    },
  })
}

// Helper to format time as HH:MM for comparison
function formatTimeHM(timeVal) {
  if (!timeVal) return null
  if (typeof timeVal === 'string') {
    // Extract HH:MM from various formats: "14:00:00", "14:00:00+00", "1970-01-01T14:00:00.000Z"
    const timeMatch = timeVal.match(/(\d{2}):(\d{2})/)
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`
    }
    return timeVal.slice(0, 5)
  }
  if (timeVal instanceof Date) {
    return timeVal.toISOString().slice(11, 16)
  }
  const strVal = String(timeVal)
  const timeMatch = strVal.match(/(\d{2}):(\d{2})/)
  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : strVal.slice(0, 5)
}

// Check if a specific slot is blocked
export function isSlotBlocked(blockedDates, date, startTime, endTime) {
  if (!blockedDates || blockedDates.length === 0) return false
  
  return blockedDates.some(block => {
    // Check if date matches
    if (block.blocked_date !== date) return false
    
    // If no specific time (entire day blocked)
    if (!block.start_time || !block.end_time) return true
    
    // Check if times overlap using proper time parsing
    const blockStart = formatTimeHM(block.start_time)
    const blockEnd = formatTimeHM(block.end_time)
    const slotStart = formatTimeHM(startTime)
    const slotEnd = formatTimeHM(endTime)
    
    // Overlap exists if:
    // slot starts before block ends AND slot ends after block starts
    return slotStart < blockEnd && slotEnd > blockStart
  })
}

// Check if an entire day is blocked
export function isDayBlocked(blockedDates, date) {
  if (!blockedDates || blockedDates.length === 0) return false
  
  return blockedDates.some(block => {
    return block.blocked_date === date && !block.start_time && !block.end_time
  })
}
