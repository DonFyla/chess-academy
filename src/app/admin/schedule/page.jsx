'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCoaches, useCreateCoach, useDeleteCoach } from '@/hooks/useCoaches'
import { useCoachAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useAvailability'
import { useAllBookings, useConfirmPayment, useRejectBooking } from '@/hooks/useBookings'
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
import { Plus, Trash2, CheckCircle, XCircle, Calendar, Users, Clock } from 'lucide-react'
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

export default function AdminSchedulePage() {
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

  const { data: coaches, isLoading: loadingCoaches } = useCoaches()
  const { data: allBookings, isLoading: loadingBookings } = useAllBookings()
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(selectedCoach?.id)

  const createCoach = useCreateCoach()
  const deleteCoach = useDeleteCoach()
  const createAvailability = useCreateAvailability()
  const deleteAvailability = useDeleteAvailability()
  const confirmPayment = useConfirmPayment()
  const rejectBooking = useRejectBooking()
  const [rejectNotes, setRejectNotes] = useState('')

  // Check if user is admin (simplified - in production, check auth)
  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return false
    }
    // Additional admin check would go here
    return true
  }

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

  const pendingPaymentBookings = allBookings?.filter(b => b.status === 'pending_payment') || []
  const confirmedBookings = allBookings?.filter(b => b.status === 'confirmed') || []
  const paymentReceivedBookings = allBookings?.filter(b => b.status === 'payment_received') || []

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
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-black">Admin Schedule Dashboard</h1>
            <a 
              href="/admin/coaches" 
              className="px-4 py-2 bg-[#5E5044] text-white rounded-lg hover:bg-[#4a3f35] transition-colors"
            >
              Manage Coaches & Users
            </a>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="bg-white">
              <TabsTrigger value="bookings" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Calendar className="mr-2 h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="coaches" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Users className="mr-2 h-4 w-4" />
                Coaches
              </TabsTrigger>
              <TabsTrigger value="availability" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Clock className="mr-2 h-4 w-4" />
                Availability
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

                {/* Rejection Notes Modal would go here - simplified for now */}
                {rejectNotes !== '' && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                      <CardHeader>
                        <CardTitle>Rejection Reason</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Enter reason for rejection (optional)"
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          className="mb-4"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleRejectBooking()} variant="destructive">
                            Reject Booking
                          </Button>
                          <Button onClick={() => setRejectNotes('')} variant="outline">
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

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
                          <div>
                            <h3 className="font-medium text-black">{coach.name}</h3>
                            <p className="text-sm text-gray-500">{coach.specialization}</p>
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
                          {coach.name}
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
          </Tabs>
        </main>
      </div>
      <Footer />
    </>
  )
}
