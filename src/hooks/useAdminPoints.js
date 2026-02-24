'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch pending points purchases (admin only)
export function usePendingPointsPurchases() {
  return useQuery({
    queryKey: ['pending-points-purchases'],
    queryFn: async () => {
      console.log('Fetching pending purchases...')
      
      // First try the RPC function (try both function names)
      let result = await supabase.rpc('get_pending_purchases')
      
      if (result.error) {
        console.log('Trying old function name...')
        result = await supabase.rpc('get_pending_points_purchases')
      }
      
      const { data, error } = result
      
      if (error) {
        console.error('RPC Error:', error)
        // Fallback to direct query if function fails
        console.log('Falling back to direct query...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('point_transactions')
          .select(`
            *,
            users:user_id(email, raw_user_meta_data)
          `)
          .eq('type', 'purchase')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        
        if (fallbackError) {
          console.error('Fallback Error:', fallbackError)
          // Last resort: try the view
          console.log('Trying view...')
          const { data: viewData, error: viewError } = await supabase
            .from('admin_pending_purchases')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (viewError) {
            console.error('View Error:', viewError)
            throw viewError
          }
          
          return viewData || []
        }
        
        // Transform data to match expected format
        return (fallbackData || []).map(tx => ({
          ...tx,
          user_email: tx.users?.email,
          user_name: tx.users?.raw_user_meta_data?.full_name || tx.users?.email
        }))
      }
      
      console.log('Pending purchases:', data?.length || 0, 'items')
      return data || []
    },
  })
}

// Fetch all points transactions (admin only)
export function useAllPointsTransactions() {
  return useQuery({
    queryKey: ['all-points-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`
          *,
          users:user_id(email, raw_user_meta_data)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return data || []
    },
  })
}

// Confirm points purchase and disburse points (admin only)
export function useConfirmPointsPurchase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ transactionId, userId, pointsAmount, userEmail, userName }) => {
      // 1. Get current user points
      const { data: currentPoints, error: balanceError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        throw new Error('Could not fetch user points')
      }
      
      const newBalance = (currentPoints?.balance || 0) + pointsAmount
      const newTotalPurchased = (currentPoints?.total_purchased || 0) + pointsAmount
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      
      // 2. Upsert user_points
      const { error: upsertError } = await supabase
        .from('user_points')
        .upsert({
          user_id: userId,
          balance: newBalance,
          total_purchased: newTotalPurchased,
          total_used: currentPoints?.total_used || 0,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      
      if (upsertError) throw upsertError
      
      // 3. Update transaction status
      const { error: updateError } = await supabase
        .from('point_transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId)
      
      if (updateError) throw updateError
      
      // 4. Send confirmation email
      try {
        await fetch('/api/points-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pointsPurchaseConfirmed',
            data: {
              student_name: userName || userEmail,
              student_email: userEmail,
              points_amount: pointsAmount,
              new_balance: newBalance,
              expires_at: expiresAt.toISOString(),
            }
          })
        })
      } catch (e) {
        console.error('Failed to send confirmation email:', e)
      }
      
      return { success: true, newBalance }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-points-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['all-points-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['user-points'] })
    },
  })
}

// Reject points purchase (admin only)
export function useRejectPointsPurchase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ transactionId, reason }) => {
      const { error } = await supabase
        .from('point_transactions')
        .update({ 
          status: 'cancelled',
          description: `Purchase rejected: ${reason}`
        })
        .eq('id', transactionId)
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-points-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['all-points-transactions'] })
    },
  })
}

// Add points manually (admin only)
export function useAddPointsManual() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, points, description, adminId }) => {
      // Get current balance
      const { data: currentPoints } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      const newBalance = (currentPoints?.balance || 0) + points
      const newTotalPurchased = (currentPoints?.total_purchased || 0) + points
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      
      // Upsert user_points
      const { error: upsertError } = await supabase
        .from('user_points')
        .upsert({
          user_id: userId,
          balance: newBalance,
          total_purchased: newTotalPurchased,
          total_used: currentPoints?.total_used || 0,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      
      if (upsertError) throw upsertError
      
      // Create transaction record
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'bonus',
          amount: points,
          balance_after: newBalance,
          description: description || 'Manual points addition by admin',
          status: 'completed',
          expires_at: expiresAt.toISOString(),
        })
      
      if (txError) throw txError
      
      return { success: true, newBalance }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-points-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['user-points'] })
    },
  })
}
