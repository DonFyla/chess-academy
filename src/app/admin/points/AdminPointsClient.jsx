'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { usePendingPointsPurchases, useAllPointsTransactions, useConfirmPointsPurchase, useRejectPointsPurchase, useAddPointsManual } from '@/hooks/useAdminPoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Coins, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Search,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// Hook to fetch users (for manual points addition)
function useAdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users')
        const data = await res.json()
        setUsers(data.users || [])
      } catch (e) {
        console.error('Failed to fetch users:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])
  
  return { users, loading }
}

function PendingPurchaseCard({ purchase, onConfirm, onReject, isProcessing }) {
  const userName = purchase.user_name || purchase.user_email
  const userEmail = purchase.user_email
  
  return (
    <Card className="mb-4 border-yellow-200">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
              <span className="text-sm text-gray-500">
                {format(new Date(purchase.created_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-black">{userName}</span>
            </div>
            <p className="text-sm text-gray-600">{userEmail}</p>
            
            <div className="mt-3 flex items-center gap-4">
              <div className="bg-[#F5EFE7] px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Points: </span>
                <span className="font-bold text-[#5E5044] text-lg">{purchase.amount}</span>
              </div>
              {purchase.payment_reference && (
                <div className="text-sm">
                  <span className="text-gray-600">Ref: </span>
                  <span className="font-mono">{purchase.payment_reference}</span>
                </div>
              )}
            </div>
            
            {purchase.description && (
              <p className="text-sm text-gray-500 mt-2">{purchase.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(purchase)}
              disabled={isProcessing}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onConfirm(purchase)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Confirm & Add Points
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionItem({ transaction }) {
  const typeColors = {
    purchase: 'bg-green-100 text-green-800',
    usage: 'bg-red-100 text-red-800',
    refund: 'bg-blue-100 text-blue-800',
    bonus: 'bg-purple-100 text-purple-800',
  }
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }
  
  const userName = transaction.users?.raw_user_meta_data?.full_name || transaction.users?.email
  
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={typeColors[transaction.type] || 'bg-gray-100'}>
            {transaction.type}
          </Badge>
          <Badge className={statusColors[transaction.status] || 'bg-gray-100'}>
            {transaction.status}
          </Badge>
        </div>
        <p className="text-sm font-medium text-black">{userName}</p>
        <p className="text-xs text-gray-500">
          {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
        </p>
        {transaction.description && (
          <p className="text-xs text-gray-400 mt-1">{transaction.description}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {transaction.amount > 0 ? '+' : ''}{transaction.amount} pts
        </p>
        <p className="text-xs text-gray-500">Balance: {transaction.balance_after}</p>
      </div>
    </div>
  )
}

function ManualPointsForm({ users, onSubmit, isProcessing }) {
  const [selectedUser, setSelectedUser] = useState('')
  const [points, setPoints] = useState('')
  const [description, setDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredUsers = (users || []).filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.user_metadata?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedUser || !points) return
    
    onSubmit({
      userId: selectedUser,
      points: parseInt(points),
      description,
    })
    
    // Reset form
    setSelectedUser('')
    setPoints('')
    setDescription('')
    setSearchTerm('')
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Search User</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div>
        <Label>Select User *</Label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
          required
        >
          <option value="">-- Select a user --</option>
          {filteredUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.email} {user.user_metadata?.full_name ? `(${user.user_metadata.full_name})` : ''}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <Label>Points to Add *</Label>
        <Input
          type="number"
          min="1"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          required
          placeholder="Enter points amount"
        />
      </div>
      
      <div>
        <Label>Description (optional)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Bonus points, Manual adjustment..."
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isProcessing || !selectedUser || !points}
        className="w-full bg-[#5E5044]"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Add Points
          </>
        )}
      </Button>
    </form>
  )
}

export default function AdminPointsClient() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  
  const { data: pendingPurchases, isLoading: pendingLoading } = usePendingPointsPurchases()
  const { data: allTransactions, isLoading: transactionsLoading } = useAllPointsTransactions()
  const confirmPurchase = useConfirmPointsPurchase()
  const rejectPurchase = useRejectPointsPurchase()
  const addPointsManual = useAddPointsManual()
  const { users, loading: usersLoading } = useAdminUsers()
  
  // Check admin auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        const { data: coach } = await supabase
          .from('coaches')
          .select('is_admin')
          .eq('user_id', user.id)
          .single()
        
        if (!coach?.is_admin) {
          router.push('/')
          return
        }
        
        setIsAdmin(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])
  
  const handleConfirm = async (purchase) => {
    try {
      await confirmPurchase.mutateAsync({
        transactionId: purchase.id,
        userId: purchase.user_id,
        pointsAmount: purchase.amount,
        userEmail: purchase.user_email,
        userName: purchase.user_name,
      })
      toast.success(`Added ${purchase.amount} points to ${purchase.user_email}`)
    } catch (error) {
      toast.error('Failed to confirm: ' + error.message)
    }
  }
  
  const handleReject = (purchase) => {
    setSelectedPurchase(purchase)
    setShowRejectModal(true)
  }
  
  const submitReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    
    try {
      await rejectPurchase.mutateAsync({
        transactionId: selectedPurchase.id,
        reason: rejectReason,
      })
      toast.success('Purchase rejected')
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedPurchase(null)
    } catch (error) {
      toast.error('Failed to reject: ' + error.message)
    }
  }
  
  const handleManualAdd = async (data) => {
    try {
      await addPointsManual.mutateAsync(data)
      toast.success(`Added ${data.points} points successfully`)
    } catch (error) {
      toast.error('Failed to add points: ' + error.message)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
      </div>
    )
  }
  
  if (!isAdmin) return null
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-black">Points Management</h1>
              <a href="/admin/schedule" className="text-[#5E5044] hover:underline">
                Back to Admin
              </a>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Clock className="w-4 h-4 mr-2" />
                Pending Purchases
                {pendingPurchases?.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">{pendingPurchases.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                All Transactions
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Points Manually
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Points Purchases</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                    </div>
                  ) : !pendingPurchases || pendingPurchases.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>No pending purchases</p>
                    </div>
                  ) : (
                    pendingPurchases.map(purchase => (
                      <PendingPurchaseCard
                        key={purchase.id}
                        purchase={purchase}
                        onConfirm={handleConfirm}
                        onReject={handleReject}
                        isProcessing={confirmPurchase.isPending || rejectPurchase.isPending}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>All Points Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                    </div>
                  ) : !allTransactions || allTransactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {allTransactions.map(tx => (
                        <TransactionItem key={tx.id} transaction={tx} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="manual">
              <div className="max-w-md mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Points Manually</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5E5044]" />
                      </div>
                    ) : (
                      <ManualPointsForm
                        users={users}
                        onSubmit={handleManualAdd}
                        isProcessing={addPointsManual.isPending}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Reject Purchase</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to reject this purchase?
                </p>
                <div className="mb-4">
                  <Label>Reason (required)</Label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Payment not received, Invalid receipt..."
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRejectModal(false)
                      setRejectReason('')
                      setSelectedPurchase(null)
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitReject}
                    disabled={!rejectReason.trim() || rejectPurchase.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    {rejectPurchase.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Reject'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
