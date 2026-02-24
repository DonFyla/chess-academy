'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPoints, usePointTransactions, useFlexibleBookings, useCancelFlexibleBooking } from '@/hooks/usePoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Coins, 
  Calendar, 
  Clock, 
  History, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  Crown,
  Loader2
} from 'lucide-react'
import { format, parseISO, isPast, differenceInHours } from 'date-fns'
import { toast } from 'sonner'

function formatTime(time) {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function BookingCard({ booking, onCancel }) {
  const sessionDate = parseISO(booking.session_date)
  const isPastSession = isPast(sessionDate)
  const hoursUntil = differenceInHours(sessionDate, new Date())
  const canCancel = !isPastSession && hoursUntil >= 24 && booking.status === 'confirmed'
  
  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
  }
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[booking.status] || 'bg-gray-100'}>
                {booking.status}
              </Badge>
              {booking.coaches?.points_cost > 1 && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Crown className="w-3 h-3 mr-1" />
                  Elite
                </Badge>
              )}
            </div>
            
            <h3 className="font-bold text-lg text-black">{booking.coaches?.name}</h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(sessionDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
            
            <div className="mt-2 text-sm">
              <span className="text-gray-600">Points used: </span>
              <span className="font-semibold text-[#5E5044]">{booking.points_used}</span>
            </div>
            
            {booking.meeting_link && booking.status === 'confirmed' && (
              <div className="mt-3">
                <a 
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Join Meeting →
                </a>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {canCancel ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCancel(booking)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel & Refund
              </Button>
            ) : booking.status === 'cancelled' ? (
              <span className="text-sm text-gray-500">
                Cancelled {booking.refund_processed ? '(Refunded)' : ''}
              </span>
            ) : isPastSession ? (
              <span className="text-sm text-gray-500">Session completed</span>
            ) : (
              <span className="text-sm text-orange-500">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Cannot cancel (&lt; 24h)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionItem({ transaction }) {
  const typeColors = {
    purchase: 'text-green-600',
    usage: 'text-red-600',
    refund: 'text-blue-600',
    bonus: 'text-purple-600',
    expired: 'text-gray-600',
  }
  
  const typeIcons = {
    purchase: Plus,
    usage: ArrowRight,
    refund: CheckCircle,
    bonus: Coins,
    expired: XCircle,
  }
  
  const Icon = typeIcons[transaction.type] || Coins
  
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-gray-100 ${typeColors[transaction.type]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-black capitalize">{transaction.type}</p>
          <p className="text-xs text-gray-500">{format(parseISO(transaction.created_at), 'MMM d, yyyy')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${typeColors[transaction.type]}`}>
          {transaction.amount > 0 ? '+' : ''}{transaction.amount} pts
        </p>
        <p className="text-xs text-gray-500">Balance: {transaction.balance_after}</p>
      </div>
    </div>
  )
}

export default function DashboardClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('upcoming')
  
  const { data: points, isLoading: pointsLoading } = useUserPoints(user?.id)
  const { data: transactions, isLoading: txLoading } = usePointTransactions(user?.id)
  const { data: bookings, isLoading: bookingsLoading } = useFlexibleBookings(user?.id)
  const cancelBooking = useCancelFlexibleBooking()
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])
  
  const handleCancel = async (booking) => {
    if (!confirm('Are you sure you want to cancel this booking? Points will be refunded.')) {
      return
    }
    
    try {
      await cancelBooking.mutateAsync({ 
        bookingId: booking.id, 
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.full_name || user.email,
        coachName: booking.coaches?.name
      })
      toast.success('Booking cancelled and points refunded!')
    } catch (error) {
      toast.error(error.message || 'Failed to cancel booking')
    }
  }
  
  if (authLoading || !user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#5E5044]" />
        </div>
        <Footer />
      </>
    )
  }
  
  // Filter bookings
  const upcomingBookings = bookings?.filter(b => 
    b.status === 'confirmed' && !isPast(parseISO(b.session_date))
  ) || []
  
  const pastBookings = bookings?.filter(b => 
    b.status === 'completed' || 
    b.status === 'cancelled' || 
    b.status === 'no_show' ||
    (b.status === 'confirmed' && isPast(parseISO(b.session_date)))
  ) || []
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">My Dashboard</h1>
            <p className="text-gray-600">Manage your points and bookings</p>
          </div>
          
          {/* Points Card */}
          <Card className="mb-8 bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Coins className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-gray-200 text-sm">Available Points</p>
                    <p className="text-4xl font-bold">
                      {pointsLoading ? '...' : (points?.balance || 0)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-200">Total Purchased</p>
                    <p className="text-xl font-semibold">{points?.total_purchased || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-200">Total Used</p>
                    <p className="text-xl font-semibold">{points?.total_used || 0}</p>
                  </div>
                </div>
                
                <Link href="/buy-points">
                  <Button className="bg-white text-[#5E5044] hover:bg-gray-100">
                    <Plus className="w-4 h-4 mr-2" />
                    Buy Points
                  </Button>
                </Link>
              </div>
              
              {points?.expires_at && (
                <p className="mt-4 text-sm text-gray-200">
                  Points expire on: {format(parseISO(points.expires_at), 'MMMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link href="/book-with-points">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F5EFE7] rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#5E5044]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black">Book a Class</h3>
                    <p className="text-sm text-gray-600">Use your points to book flexible classes</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/special-coaches">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black">Elite Coaches</h3>
                    <p className="text-sm text-gray-600">Book with FIDE Masters (2-3 points/class)</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                </CardContent>
              </Card>
            </Link>
          </div>
          
          {/* Bookings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Calendar className="w-4 h-4 mr-2" />
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <History className="w-4 h-4 mr-2" />
                History ({pastBookings.length})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Coins className="w-4 h-4 mr-2" />
                Transactions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {bookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                </div>
              ) : upcomingBookings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-bold text-black mb-2">No Upcoming Bookings</h3>
                    <p className="text-gray-600 mb-4">Use your points to book flexible classes when you&apos;re available.</p>
                    <Link href="/book-with-points">
                      <Button className="bg-[#5E5044]">
                        Book a Class
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                upcomingBookings.map(booking => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancel={handleCancel}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="history">
              {bookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                </div>
              ) : pastBookings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No past bookings yet.</p>
                  </CardContent>
                </Card>
              ) : (
                pastBookings.map(booking => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancel={handleCancel}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Point Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {txLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                    </div>
                  ) : transactions?.length === 0 ? (
                    <p className="text-center text-gray-600 py-8">No transactions yet.</p>
                  ) : (
                    transactions.map(tx => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  )
}
