'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch availability for a specific coach
export function useCoachAvailability(coachId) {
  return useQuery({
    queryKey: ['availability', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('coach_id', coachId)
        .order('day_of_week')
        .order('start_time')
      
      if (error) throw error
      return data
    },
    enabled: !!coachId,
  })
}

// Create availability slot
export function useCreateAvailability() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (slot) => {
      const { data, error } = await supabase
        .from('availability_slots')
        .insert([{
          coach_id: slot.coach_id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time
        }])
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['availability', data.coach_id] })
    },
  })
}

// Delete availability slot
export function useDeleteAvailability() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, coachId }) => {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return coachId
    },
    onSuccess: (coachId) => {
      queryClient.invalidateQueries({ queryKey: ['availability', coachId] })
    },
  })
}
