'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AddAvailabilityForm from '@/components/scheduling/AddAvailabilityForm'
import AvailabilityList from '@/components/scheduling/AvailabilityList'
import { useCoachAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useAvailability'
import { useCoachBookings } from '@/hooks/useBookings'
import { useCoachFlexibleBookings } from '@/hooks/usePoints'
import { useCoachBlockedDates, useBlockCoachDate, useUnblockCoachDate } from '@/hooks/useCoachBlocks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, addDays } from 'date-fns'
import { Clock, Calendar, ArrowLeft, Video, Save, Coins, Ban, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, getCurrentCoach } from '@/lib/supabase'

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function CoachAvailabilityClient() {
  const router = useRouter()
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)
  const [meetingLink, setMeetingLink] = useState('')
  const [savingLink, setSavingLink] = useState(false)

  useEffect(() => {
    async function loadCoach() {
      try {
        const currentCoach = await getCurrentCoach()
        if (!currentCoach) {
          toast.error('Please log in to access this page')
          router.push('/')
          return
        }
        setCoach(currentCoach)
        setMeetingLink(currentCoach.meeting_link || '')
      } catch (error) {
        toast.error('Failed to load coach data')
      } finally {
        setLoading(false)
      }
    }
    loadCoach()
  }, [router])

  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(coach?.id)
  const { data: bookings = [], isLoading: loadingBookings } = useCoachBookings(coach?.id)
  const { data: flexibleBookings = [], isLoading: loadingFlexibleBookings } = useCoachFlexibleBookings(coach?.id)
  const { data: blockedDates = [], isLoading: loadingBlockedDates } = useCoachBlockedDates(coach?.id)

  const createAvailability = useCreateAvailability()
  const deleteAvailability = useDeleteAvailability()
  const blockDate = useBlockCoachDate()
  const unblockDate = useUnblockCoachDate()
  
  // Block date form state
  const [blockForm, setBlockForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    isFullDay: false
  })

  const handleAddAvailability = async (slot) => {
    try {
      await createAvailability.mutateAsync({ ...slot, coach_id: coach.id })
      toast.success('Availability added')
    } catch (error) {
      toast.error('Failed to add availability')
    }
  }

  const handleDeleteAvailability = async (id) => {
    try {
      await deleteAvailability.mutateAsync({ id, coachId: coach.id })
      toast.success('Availability removed')
    } catch (error) {
      toast.error('Failed to remove availability')
    }
  }
  
  const handleBlockDate = async (e) => {
    e.preventDefault()
    if (!blockForm.date) {
      toast.error('Please select a date')
      return
    }
    
    try {
      await blockDate.mutateAsync({
        coachId: coach.id,
        blockedDate: blockForm.date,
        startTime: blockForm.isFullDay ? null : blockForm.startTime,
        endTime: blockForm.isFullDay ? null : blockForm.endTime,
        reason: blockForm.reason
      })
      toast.success('Date blocked successfully')
      setBlockForm({ date: '', startTime: '', endTime: '', reason: '', isFullDay: false })
    } catch (error) {
      toast.error('Failed to block date')
    }
  }
  
  const handleUnblockDate = async (blockId) => {
    try {
      await unblockDate.mutateAsync({ blockId, coachId: coach.id })
      toast.success('Date unblocked')
    } catch (error) {
      toast.error('Failed to unblock date')
    }
  }

  const handleSaveMeetingLink = async () => {
    if (!coach) return
    
    setSavingLink(true)
    try {
      const { error } = await supabase
        .from('coaches')
        .update({ meeting_link: meetingLink.trim() || null })
        .eq('id', coach.id)
      
      if (error) throw error
      
      toast.success('Meeting link saved successfully!')
      // Update local coach data
      setCoach({ ...coach, meeting_link: meetingLink.trim() || null })
    } catch (error) {
      console.error('Error saving meeting link:', error)
      toast.error('Failed to save meeting link')
    } finally {
      setSavingLink(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
        <Footer />
      </>
    )
  }

  if (!coach) {
    return null // Redirect handled in useEffect
  }

  const upcomingBookings = bookings
    ?.filter(b => new Date(b.booking_date) >= new Date() && b.status !== 'cancelled')
    ?.sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date))
    ?.slice(0, 10) || []

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" asChild className="text-[#5E5044]">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black">Coach Dashboard</h1>
            <span className="text-gray-600">Welcome, {coach.name}</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Meeting Link + Upcoming Bookings */}
            <div className="space-y-8">
              {/* Meeting Link */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-black flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    My Meeting Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Set your Zoom or Google Meet link. This will be automatically sent to students when their payment is confirmed.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Meeting URL</label>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://zoom.us/j/123456789"
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveMeetingLink}
                    disabled={savingLink}
                    className="bg-[#5E5044] hover:bg-[#4a3f35]"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingLink ? 'Saving...' : 'Save Meeting Link'}
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Bookings - Monthly Recurring */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Recurring Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="animate-pulse h-32 bg-gray-200 rounded" />
                ) : upcomingBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No monthly bookings.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-black">{booking.student_name}</span>
                          <Badge
                            variant={
                              booking.status === 'confirmed'
                                ? 'default'
                                : booking.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={booking.status === 'confirmed' ? 'bg-green-600' : ''}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</div>
                          <div>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
                          {booking.student_email && (
                            <div className="mt-1">{booking.student_email}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flexible Point Bookings */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Flexible Point Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFlexibleBookings ? (
                  <div className="animate-pulse h-32 bg-gray-200 rounded" />
                ) : flexibleBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No point-based bookings.</p>
                ) : (
                  <div className="space-y-3">
                    {flexibleBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-black">
                            {booking.users?.raw_user_meta_data?.full_name || booking.users?.email}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#5E5044]">
                              <Coins className="w-3 h-3 mr-1" />
                              {booking.points_used} pts
                            </Badge>
                            <Badge
                              className={booking.status === 'confirmed' ? 'bg-green-600' : ''}
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div>{format(new Date(booking.session_date), 'MMM d, yyyy')}</div>
                          <div>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
                          {booking.users?.email && (
                            <div className="mt-1">{booking.users.email}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div> {/* End Left Column */}

            {/* Right Column: Manage Availability + Block Dates */}
            <div className="space-y-6">
              {/* Weekly Availability */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-black flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    My Weekly Availability
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
              
              {/* Block Specific Dates */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-black flex items-center gap-2">
                    <Ban className="h-5 w-5" />
                    Block Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Block specific dates or time slots when you&apos;re not available.
                    <span className="block mt-1 text-xs text-gray-500">
                      Tip: To block multiple hours (e.g., 10am-12pm), set From/To times and it will block all overlapping slots.
                    </span>
                  </p>
                  
                  {/* Block Form */}
                  <form onSubmit={handleBlockDate} className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date *</label>
                      <input
                        type="date"
                        value={blockForm.date}
                        onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        required
                        className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="fullDay"
                        checked={blockForm.isFullDay}
                        onChange={(e) => setBlockForm({ ...blockForm, isFullDay: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="fullDay" className="text-sm text-gray-700">Block entire day</label>
                    </div>
                    
                    {!blockForm.isFullDay && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">From</label>
                          <input
                            type="time"
                            value={blockForm.startTime}
                            onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                            required={!blockForm.isFullDay}
                            className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">To</label>
                          <input
                            type="time"
                            value={blockForm.endTime}
                            onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                            required={!blockForm.isFullDay}
                            className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
                      <input
                        type="text"
                        value={blockForm.reason}
                        onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                        placeholder="e.g., Vacation, Personal appointment"
                        className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                      />
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={blockDate.isPending}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {blockDate.isPending ? 'Blocking...' : 'Block Date'}
                    </Button>
                  </form>
                  
                  {/* Blocked Dates List */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Blocked Dates</h4>
                    {loadingBlockedDates ? (
                      <div className="animate-pulse h-20 bg-gray-200 rounded" />
                    ) : blockedDates.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No blocked dates.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {blockedDates.map((block) => (
                          <div
                            key={block.id}
                            className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-black">
                                {format(new Date(block.blocked_date), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-gray-600">
                                {block.start_time ? (
                                  `${formatTime(block.start_time)} - ${formatTime(block.end_time)}`
                                ) : (
                                  'Full day'
                                )}
                              </div>
                              {block.reason && (
                                <div className="text-xs text-gray-500 truncate">{block.reason}</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnblockDate(block.id)}
                              disabled={unblockDate.isPending}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
