'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch pending points purchases (admin only)
export function usePendingPointsPurchases() {
  return useQuery({
    queryKey: ['pending-points-purchases'],
    queryFn: async () => {
      console.log('Fetching pending purchases...')
      
      // Try the RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_pending_purchases')
      
      if (!rpcError && rpcData) {
        console.log('Pending purchases (RPC):', rpcData.length, 'items')
        return rpcData
      }
      
      console.log('RPC failed, trying view...', rpcError?.message)
      
      // Fallback to view
      const { data: viewData, error: viewError } = await supabase
        .from('admin_pending_purchases')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!viewError && viewData) {
        console.log('Pending purchases (view):', viewData.length, 'items')
        return viewData
      }
      
      console.log('View failed, using direct query...', viewError?.message)
      
      // Last resort: direct query with manual user lookup
      const { data: transactions, error: txError } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('type', 'purchase')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (txError) {
        console.error('Direct query error:', txError)
        throw txError
      }
      
      // Get user info for each transaction
      const userIds = [...new Set(transactions.map(tx => tx.user_id).filter(Boolean))]
      let userMap = {}
      
      if (userIds.length > 0) {
        try {
          const { data: userData } = await supabase.rpc('get_user_info', { user_ids: userIds })
          userData?.forEach(user => {
            userMap[user.id] = user
          })
        } catch (e) {
          console.error('Failed to fetch user info:', e)
        }
      }
      
      const result = transactions.map(tx => ({
        ...tx,
        user_email: userMap[tx.user_id]?.email || 'Unknown',
        user_name: userMap[tx.user_id]?.full_name || userMap[tx.user_id]?.email || 'Unknown'
      }))
      
      console.log('Pending purchases (direct):', result.length, 'items')
      return result
    },
  })
}

// Fetch all points transactions (admin only)
export function useAllPointsTransactions() {
  return useQuery({
    queryKey: ['all-points-transactions'],
    queryFn: async () => {
      // First, get all transactions
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching transactions:', error)
        throw error
      }
      
      if (!transactions || transactions.length === 0) {
        return []
      }
      
      // Get unique user IDs
      const userIds = [...new Set(transactions.map(tx => tx.user_id).filter(Boolean))]
      
      // Fetch user info using the RPC function
      let userMap = {}
      if (userIds.length > 0) {
        try {
          const { data: userData, error: userError } = await supabase
            .rpc('get_user_info', { user_ids: userIds })
          
          if (userError) {
            console.error('Error fetching user info:', userError)
          } else {
            userData?.forEach(user => {
              userMap[user.id] = user
            })
          }
        } catch (e) {
          console.error('Failed to fetch user details:', e)
        }
      }
      
      // Merge transactions with user data
      return transactions.map(tx => ({
        ...tx,
        users: userMap[tx.user_id] || null
      }))
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
