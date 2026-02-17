'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch all coaches
export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at')
      
      if (error) throw error
      return data
    },
  })
}

// Fetch single coach
export function useCoach(coachId) {
  return useQuery({
    queryKey: ['coaches', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', coachId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!coachId,
  })
}

// Create new coach (admin only)
export function useCreateCoach() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (coach) => {
      const { data, error } = await supabase
        .from('coaches')
        .insert(coach)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
    },
  })
}

// Update coach
export function useUpdateCoach() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('coaches')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
      queryClient.invalidateQueries({ queryKey: ['coaches', data.id] })
    },
  })
}

// Delete coach (admin only)
export function useDeleteCoach() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
    },
  })
}
