'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAllCoaches, useCreateCoach, useDeleteCoach } from '@/hooks/useCoaches'
import { useCoachAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useAvailability'
import { useAllBookings, useConfirmPayment, useRejectBooking } from '@/hooks/useBookings'
import { useAllFlexibleBookings } from '@/hooks/usePoints'
import { useAllSpecialBookings, useConfirmSpecialBooking, useRejectSpecialBooking } from '@/hooks/useSpecialCoaches'
import { useCoachBlockedDates, useBlockCoachDate, useUnblockCoachDate } from '@/hooks/useCoachBlocks'
import AddAvailabilityForm from '@/components/scheduling/AddAvailabilityForm'
import AvailabilityList from '@/components/scheduling/AvailabilityList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Plus, Trash2, CheckCircle, XCircle, Calendar, Users, Clock, Coins, Crown, Star, Ban, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

function formatTime(time) {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Format schedule display for admin
function formatSchedule(booking) {
  if (!booking.recurring_days || booking.recurring_days.length === 0) {
    return `${format(new Date(booking.booking_date), 'MMM d')} ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`
  }
  
  // For single day
  if (booking.recurring_days.length === 1) {
    const day = daysOfWeek[booking.recurring_days[0]]
    return `${day}s ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`
  }
  
  // For two days with different times
  if (booking.recurring_dates && Array.isArray(booking.recurring_dates)) {
    const scheduleItems = booking.recurring_days.map(dayIndex => {
      const dayName = daysOfWeek[dayIndex]
      const dateInfo = booking.recurring_dates.find(d => {
        const date = new Date(d.date)
        return date.getDay() === dayIndex
      })
      if (dateInfo) {
        return `${dayName}s ${formatTime(dateInfo.start_time)} - ${formatTime(dateInfo.end_time)}`
      }
      return `${dayName}s ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`
    })
    return scheduleItems.join(', ')
  }
  
  // Fallback
  const dayNames = booking.recurring_days.map(d => daysOfWeek[d]).join(', ')
  return `${dayNames} ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`
}

function getBookingModeLabel(mode) {
  if (mode === 'double') return '2x/week (8 sessions)'
  return '1x/week (4 sessions)'
}

// Separate component for Flexible Bookings Tab
function FlexibleBookingsTab({ flexibleBookings, loadingFlexibleBookings, flexibleUserMap, formatTime }) {
  if (loadingFlexibleBookings) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Flexible Point Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-32 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    )
  }
  
  if (!flexibleBookings || flexibleBookings.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Flexible Point Bookings
            <Badge variant="secondary" className="bg-blue-500 text-white">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No flexible bookings yet.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-black flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Flexible Point Bookings
          <Badge variant="secondary" className="bg-blue-500 text-white">
            {flexibleBookings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flexibleBookings.map((booking) => {
              const userInfo = flexibleUserMap[booking.user_id]
              const coachName = booking.coaches?.name || `Coach ${booking.coach_id?.slice(0, 8)}`
              const sessionDate = booking.session_date ? new Date(booking.session_date) : null
              
              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium text-black">
                      {userInfo?.full_name || userInfo?.email || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500">{userInfo?.email || booking.user_id?.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell>{coachName}</TableCell>
                  <TableCell>
                    <div className="text-sm">{sessionDate ? format(sessionDate, 'MMM d, yyyy') : 'Invalid Date'}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-[#5E5044]">
                      <Coins className="w-3 h-3 mr-1" />
                      {booking.points_used} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={booking.status === 'confirmed' ? 'bg-green-600' : 'bg-gray-500'}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AdminScheduleClient() {
  const router = useRouter()
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [newCoach, setNewCoach] = useState({ name: '', bio: '', specialization: '', email: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check admin auth
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
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

  const { data: coaches, isLoading: loadingCoaches } = useAllCoaches()
  const { data: allBookings, isLoading: loadingBookings } = useAllBookings()
  
  // Block dates state
  const [blockCoachId, setBlockCoachId] = useState('')
  const [blockDate, setBlockDate] = useState('')
  const [blockStartTime, setBlockStartTime] = useState('')
  const [blockEndTime, setBlockEndTime] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blockAllDay, setBlockAllDay] = useState(true)
  
  const { data: blockedDates = [], isLoading: loadingBlockedDates } = useCoachBlockedDates(blockCoachId)
  const blockDateMutation = useBlockCoachDate()
  const unblockDateMutation = useUnblockCoachDate()
  const { data: flexibleBookings = [], isLoading: loadingFlexibleBookings } = useAllFlexibleBookings()
  const { data: specialBookings = [], isLoading: loadingSpecialBookings } = useAllSpecialBookings()
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(selectedCoach?.id)

  const createCoach = useCreateCoach()
  const deleteCoach = useDeleteCoach()
  const createAvailability = useCreateAvailability()
  const deleteAvailability = useDeleteAvailability()
  const confirmPayment = useConfirmPayment()
  const rejectBooking = useRejectBooking()
  const confirmSpecialBooking = useConfirmSpecialBooking()
  const rejectSpecialBooking = useRejectSpecialBooking()
  const [rejectNotes, setRejectNotes] = useState('')
  const [flexibleUserMap, setFlexibleUserMap] = useState({})

  // Fetch user details for flexible bookings
  useEffect(() => {
    const fetchUserDetails = async () => {
      console.log('Fetching user details for flexible bookings:', flexibleBookings?.length)
      if (!flexibleBookings || flexibleBookings.length === 0) return
      
      const userIds = [...new Set(flexibleBookings.map(b => b.user_id).filter(Boolean))]
      console.log('User IDs to fetch:', userIds)
      if (userIds.length === 0) return
      
      try {
        const { data: userData, error } = await supabase
          .rpc('get_user_info', { user_ids: userIds })
        
        if (error) {
          console.error('Error fetching user info:', error)
          return
        }
        
        console.log('User data fetched:', userData)
        const userMap = {}
        userData?.forEach(user => {
          userMap[user.id] = user
        })
        setFlexibleUserMap(userMap)
      } catch (err) {
        console.error('Failed to fetch user details:', err)
      }
    }
    
    fetchUserDetails()
  }, [flexibleBookings])

  const handleAddCoach = async (e) => {
    e.preventDefault()
    try {
      await createCoach.mutateAsync(newCoach)
      toast.success('Coach added successfully')
      setNewCoach({ name: '', bio: '', specialization: '', email: '' })
      setShowAddCoach(false)
    } catch (error) {
      toast.error('Failed to add coach')
    }
  }

  const handleDeleteCoach = async (id) => {
    if (!confirm('Are you sure you want to delete this coach?')) return
    try {
      await deleteCoach.mutateAsync(id)
      toast.success('Coach deleted')
    } catch (error) {
      toast.error('Failed to delete coach')
    }
  }

  const handleAddAvailability = async (slot) => {
    if (!selectedCoach) {
      toast.error('Please select a coach first')
      return
    }
    try {
      console.log('Adding availability:', { ...slot, coach_id: selectedCoach.id })
      await createAvailability.mutateAsync({ 
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        coach_id: selectedCoach.id 
      })
      toast.success('Availability added successfully')
    } catch (error) {
      console.error('Error adding availability:', error)
      toast.error(`Failed to add availability: ${error.message}`)
    }
  }

  const handleDeleteAvailability = async (id) => {
    try {
      await deleteAvailability.mutateAsync({ id, coachId: selectedCoach.id })
      toast.success('Availability removed')
    } catch (error) {
      toast.error('Failed to remove availability')
    }
  }

  // Handle block date for coach
  const handleBlockDate = async (e) => {
    e.preventDefault()
    if (!blockCoachId || !blockDate) {
      toast.error('Please select a coach and date')
      return
    }
    
    try {
      await blockDateMutation.mutateAsync({
        coachId: blockCoachId,
        blockedDate: blockDate,
        startTime: blockAllDay ? null : blockStartTime,
        endTime: blockAllDay ? null : blockEndTime,
        reason: blockReason
      })
      toast.success('Date blocked successfully')
      setBlockDate('')
      setBlockStartTime('')
      setBlockEndTime('')
      setBlockReason('')
    } catch (error) {
      toast.error('Failed to block date: ' + error.message)
    }
  }
  
  // Handle unblock date
  const handleUnblockDate = async (blockId) => {
    if (!confirm('Are you sure you want to unblock this date?')) return
    try {
      await unblockDateMutation.mutateAsync({
        blockId,
        coachId: blockCoachId
      })
      toast.success('Date unblocked')
    } catch (error) {
      toast.error('Failed to unblock date')
    }
  }

  const handleConfirmPayment = async (booking) => {
    try {
      await confirmPayment.mutateAsync({
        id: booking.id,
        paymentDetails: {
          payment_method: 'whatsapp_transfer',
          payment_amount: booking.monthly_amount || 60000
        }
      })
      toast.success('Payment confirmed and booking approved!')
    } catch (error) {
      console.error('Confirm payment error:', error)
      toast.error('Failed to confirm payment: ' + (error.message || 'Unknown error'))
    }
  }

  const handleRejectBooking = async (booking) => {
    try {
      await rejectBooking.mutateAsync({
        id: booking.id,
        adminNotes: rejectNotes
      })
      toast.success('Booking rejected')
      setRejectNotes('')
    } catch (error) {
      toast.error('Failed to reject booking')
    }
  }

  // Special booking handlers
  const handleConfirmSpecialBooking = async (booking) => {
    try {
      await confirmSpecialBooking.mutateAsync({
        id: booking.id,
        paymentDetails: {
          payment_method: 'whatsapp_transfer'
        }
      })
      toast.success('Special booking payment confirmed!')
    } catch (error) {
      console.error('Confirm special booking error:', error)
      toast.error('Failed to confirm payment: ' + (error.message || 'Unknown error'))
    }
  }

  const handleRejectSpecialBooking = async (booking) => {
    try {
      await rejectSpecialBooking.mutateAsync({
        id: booking.id,
        adminNotes: rejectNotes
      })
      toast.success('Special booking cancelled')
      setRejectNotes('')
    } catch (error) {
      toast.error('Failed to cancel special booking')
    }
  }

  // Format special booking sessions for display
  const formatSpecialSessions = (sessionDates) => {
    if (!sessionDates || !Array.isArray(sessionDates) || sessionDates.length === 0) {
      return 'No sessions scheduled'
    }
    // Sort by date and take first 2
    const sorted = [...sessionDates].sort((a, b) => new Date(a.date) - new Date(b.date))
    const formatted = sorted.slice(0, 2).map(s => 
      `${format(new Date(s.date), 'MMM d')} at ${s.start_time?.slice(0, 5)}`
    )
    if (sorted.length > 2) {
      formatted.push(`+${sorted.length - 2} more`)
    }
    return formatted.join(', ')
  }

  const pendingPaymentBookings = allBookings?.filter(b => b.status === 'pending_payment') || []
  const confirmedBookings = allBookings?.filter(b => b.status === 'confirmed') || []
  const paymentReceivedBookings = allBookings?.filter(b => b.status === 'payment_received') || []
  
  // Special bookings filters
  const pendingSpecialBookings = specialBookings?.filter(b => b.status === 'pending_payment') || []
  const confirmedSpecialBookings = specialBookings?.filter(b => b.status === 'confirmed') || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#5E5044] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-black">Admin Schedule Dashboard</h1>
            <div className="flex gap-2">
              <a 
                href="/admin/classes" 
                className="px-4 py-2 bg-[#5E5044] text-white rounded-lg hover:bg-[#4a3f35] transition-colors"
              >
                View Weekly Classes
              </a>
              <a 
                href="/admin/coaches" 
                className="px-4 py-2 bg-[#5E5044] text-white rounded-lg hover:bg-[#4a3f35] transition-colors"
              >
                Manage Coaches
              </a>
              <a 
                href="/admin/points" 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Points Management
              </a>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="bg-white flex-wrap h-auto">
              <TabsTrigger value="bookings" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Calendar className="mr-2 h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="special" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Star className="mr-2 h-4 w-4" />
                Special Coaching
                {pendingSpecialBookings.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-500 text-white">{pendingSpecialBookings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="flexible" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Coins className="mr-2 h-4 w-4" />
                Flexible Bookings
              </TabsTrigger>
              <TabsTrigger value="coaches" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Users className="mr-2 h-4 w-4" />
                Coaches
              </TabsTrigger>
              <TabsTrigger value="availability" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Clock className="mr-2 h-4 w-4" />
                Availability
              </TabsTrigger>
              <TabsTrigger value="blockdates" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Ban className="mr-2 h-4 w-4" />
                Block Dates
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="grid gap-6">
                {/* Pending Payment Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      Awaiting Payment
                      <Badge variant="secondary" className="bg-yellow-500">{pendingPaymentBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : pendingPaymentBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No bookings awaiting payment.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingPaymentBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                                {booking.student_phone && (
                                  <div className="text-sm text-gray-400">{booking.student_phone}</div>
                                )}
                              </TableCell>
                              <TableCell>{booking.coaches?.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">{formatSchedule(booking)}</div>
                                <div className="text-xs text-gray-500">
                                  Starts {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {getBookingModeLabel(booking.booking_mode)}
                                </Badge>
                                {booking.course_type && (
                                  <div className="text-xs text-gray-500 capitalize mt-1">
                                    {booking.course_type}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-black">
                                  ₦{parseInt(booking.monthly_amount || 0).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmPayment(booking)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectBooking(booking)}
                                  >
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Confirmed Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      Confirmed Bookings
                      <Badge variant="default" className="bg-green-600">{confirmedBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : confirmedBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No confirmed bookings.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {confirmedBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                              </TableCell>
                              <TableCell>{booking.coaches?.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">{formatSchedule(booking)}</div>
                                <div className="text-xs text-gray-500">
                                  Starts {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs bg-green-50">
                                  {getBookingModeLabel(booking.booking_mode)}
                                </Badge>
                                {booking.course_type && (
                                  <div className="text-xs text-gray-500 capitalize mt-1">
                                    {booking.course_type}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-black">
                                  ₦{parseInt(booking.monthly_amount || 0).toLocaleString()}
                                </div>
                                {booking.payment_date && (
                                  <div className="text-xs text-green-600">
                                    Paid {format(new Date(booking.payment_date), 'MMM d')}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Special Coaching Tab */}
            <TabsContent value="special">
              <div className="grid gap-6">
                {/* Pending Special Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Special Coaching - Awaiting Payment
                      <Badge variant="secondary" className="bg-yellow-500">{pendingSpecialBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSpecialBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : pendingSpecialBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No special coaching bookings awaiting payment.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Sessions</TableHead>
                            <TableHead>Schedule Preview</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingSpecialBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                                {booking.student_phone && (
                                  <div className="text-sm text-gray-400">{booking.student_phone}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Crown className="w-4 h-4 text-yellow-600" />
                                  {booking.coaches?.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{booking.total_sessions} sessions</Badge>
                                {booking.is_recurring && (
                                  <div className="text-xs text-gray-500 mt-1">Recurring weekly</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-700">{formatSpecialSessions(booking.session_dates)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-black">
                                  ₦{parseInt(booking.total_amount || 0).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmSpecialBooking(booking)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectSpecialBooking(booking)}
                                  >
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Cancel
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Confirmed Special Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Confirmed Special Bookings
                      <Badge variant="default" className="bg-green-600">{confirmedSpecialBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSpecialBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : confirmedSpecialBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No confirmed special coaching bookings.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Sessions</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {confirmedSpecialBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Crown className="w-4 h-4 text-yellow-600" />
                                  {booking.coaches?.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-50">{booking.total_sessions} sessions</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-700">{formatSpecialSessions(booking.session_dates)}</div>
                                {booking.payment_date && (
                                  <div className="text-xs text-green-600">
                                    Paid {format(new Date(booking.payment_date), 'MMM d, yyyy')}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-black">
                                  ₦{parseInt(booking.total_amount || 0).toLocaleString()}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Flexible Bookings Tab */}
            <TabsContent value="flexible">
              <FlexibleBookingsTab 
                flexibleBookings={flexibleBookings}
                loadingFlexibleBookings={loadingFlexibleBookings}
                flexibleUserMap={flexibleUserMap}
                formatTime={formatTime}
              />
            </TabsContent>

            {/* Coaches Tab */}
            <TabsContent value="coaches">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-black">Manage Coaches</CardTitle>
                  <Button 
                    onClick={() => setShowAddCoach(true)}
                    className="bg-[#5E5044] hover:bg-[#4a3f35]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Coach
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddCoach && (
                    <form onSubmit={handleAddCoach} className="mb-6 p-4 bg-[#F5EFE7] rounded-lg space-y-4">
                      <div>
                        <Label className="text-black">Name</Label>
                        <Input
                          value={newCoach.name}
                          onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                          placeholder="Coach name"
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Specialization</Label>
                        <Input
                          value={newCoach.specialization}
                          onChange={(e) => setNewCoach({ ...newCoach, specialization: e.target.value })}
                          placeholder="e.g., Beginner Training"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Bio</Label>
                        <Textarea
                          value={newCoach.bio}
                          onChange={(e) => setNewCoach({ ...newCoach, bio: e.target.value })}
                          placeholder="Coach bio..."
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Email (for notifications)</Label>
                        <Input
                          type="email"
                          value={newCoach.email}
                          onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                          placeholder="coach@example.com"
                          className="bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-[#5E5044]">Add Coach</Button>
                        <Button type="button" variant="outline" onClick={() => setShowAddCoach(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {loadingCoaches ? (
                    <div className="animate-pulse h-32 bg-gray-200 rounded" />
                  ) : (
                    <div className="space-y-2">
                      {coaches?.map((coach) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-medium text-black">{coach.name}</h3>
                              <p className="text-sm text-gray-500">{coach.specialization}</p>
                            </div>
                            {coach.is_special && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                <Crown className="w-3 h-3 mr-1" />
                                Elite
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCoach(coach.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black">Select Coach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {coaches?.map((coach) => (
                        <Button
                          key={coach.id}
                          variant={selectedCoach?.id === coach.id ? 'default' : 'outline'}
                          className={`w-full justify-start ${
                            selectedCoach?.id === coach.id 
                              ? 'bg-[#5E5044] text-white' 
                              : 'text-black'
                          }`}
                          onClick={() => setSelectedCoach(coach)}
                        >
                          <span className="flex-1 text-left">{coach.name}</span>
                          {coach.is_special && (
                            <Crown className="w-4 h-4 text-purple-500" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {selectedCoach && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-black">
                        Manage {selectedCoach.name}&apos;s Availability
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <AddAvailabilityForm
                        onAdd={handleAddAvailability}
                        isLoading={createAvailability.isPending}
                      />
                      {loadingAvailability ? (
                        <div className="animate-pulse h-32 bg-gray-200 rounded" />
                      ) : (
                        <AvailabilityList
                          slots={availability}
                          onDelete={handleDeleteAvailability}
                          isDeleting={deleteAvailability.isPending}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Block Dates Tab */}
            <TabsContent value="blockdates">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Block Date Form */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <Ban className="h-5 w-5" />
                      Block Coach Date/Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBlockDate} className="space-y-4">
                      <div>
                        <Label className="text-black">Select Coach *</Label>
                        <select
                          value={blockCoachId}
                          onChange={(e) => setBlockCoachId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                          required
                        >
                          <option value="">-- Select a coach --</option>
                          {coaches?.map(coach => (
                            <option key={coach.id} value={coach.id}>
                              {coach.name} {coach.is_special ? '(Special)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label className="text-black">Date to Block *</Label>
                        <Input
                          type="date"
                          value={blockDate}
                          onChange={(e) => setBlockDate(e.target.value)}
                          required
                          className="mt-1"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allDay"
                          checked={blockAllDay}
                          onChange={(e) => setBlockAllDay(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="allDay" className="text-black cursor-pointer">
                          Block entire day
                        </Label>
                      </div>
                      
                      {!blockAllDay && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-black">Start Time</Label>
                            <Input
                              type="time"
                              value={blockStartTime}
                              onChange={(e) => setBlockStartTime(e.target.value)}
                              required={!blockAllDay}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-black">End Time</Label>
                            <Input
                              type="time"
                              value={blockEndTime}
                              onChange={(e) => setBlockEndTime(e.target.value)}
                              required={!blockAllDay}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-black">Reason (optional)</Label>
                        <Input
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          placeholder="e.g., Personal leave, Holiday, etc."
                          className="mt-1"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={blockDateMutation.isPending || !blockCoachId || !blockDate}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {blockDateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Blocking...
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Block Date
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Blocked Dates List */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black">
                      Blocked Dates
                      {blockCoachId && coaches?.find(c => c.id === blockCoachId)?.name && (
                        <span className="text-gray-500 text-base font-normal ml-2">
                          - {coaches.find(c => c.id === blockCoachId).name}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!blockCoachId ? (
                      <p className="text-gray-500 text-center py-8">Select a coach to view blocked dates</p>
                    ) : loadingBlockedDates ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : blockedDates.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No blocked dates for this coach</p>
                    ) : (
                      <div className="space-y-3">
                        {blockedDates.map((block) => (
                          <div key={block.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div>
                              <div className="font-medium text-black">
                                {format(new Date(block.blocked_date), 'EEEE, MMM d, yyyy')}
                              </div>
                              {block.start_time && block.end_time ? (
                                <div className="text-sm text-gray-600">
                                  {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                </div>
                              ) : (
                                <div className="text-sm text-red-600 font-medium">All day</div>
                              )}
                              {block.reason && (
                                <div className="text-xs text-gray-500 mt-1">{block.reason}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUnblockDate(block.id)}
                              disabled={unblockDateMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Footer />
    </>
  )
}
