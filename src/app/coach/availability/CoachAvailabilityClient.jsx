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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, addDays } from 'date-fns'
import { Clock, Calendar, ArrowLeft, Video, Save, Coins, Ban, X, User, Crown } from 'lucide-react'
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
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [activeTab, setActiveTab] = useState('schedule')
  
  // Profile editing state - includes ALL fields admin can fill
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    specialization: '',
    bio: '',
    achievements: '',
    photo_url: '',
    rank_title: '',
    special_bio: ''
  })
  const [savingProfile, setSavingProfile] = useState(false)

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
        
        // Set profile form with ALL current coach data
        setProfileForm({
          name: currentCoach.name || '',
          email: currentCoach.email || '',
          specialization: currentCoach.specialization || '',
          bio: currentCoach.bio || '',
          achievements: Array.isArray(currentCoach.achievements) 
            ? currentCoach.achievements.join(', ') 
            : currentCoach.achievements || '',
          photo_url: currentCoach.photo_url || '',
          rank_title: currentCoach.rank_title || '',
          special_bio: currentCoach.special_bio || ''
        })
      } catch (error) {
        toast.error('Failed to load coach data')
      } finally {
        setLoading(false)
      }
    }
    loadCoach()
  }, [router])
  
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!coach) return
    
    setSavingProfile(true)
    try {
      // Convert achievements string to array
      const achievementsArray = profileForm.achievements
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)
      
      // Prepare update data with ALL coach fields
      const updateData = {
        name: profileForm.name.trim(),
        email: profileForm.email?.trim() || null,
        specialization: profileForm.specialization?.trim() || null,
        bio: profileForm.bio?.trim() || null,
        achievements: achievementsArray.length > 0 ? achievementsArray : null,
        photo_url: profileForm.photo_url?.trim() || null,
        rank_title: profileForm.rank_title?.trim() || null,
        special_bio: profileForm.special_bio?.trim() || null
      }
      
      console.log('Updating coach profile:', { coachId: coach.id, updateData })
      
      const { data, error } = await supabase
        .from('coaches')
        .update(updateData)
        .eq('id', coach.id)
        .select()
        .single()
      
      if (error) {
        console.error('Supabase update error:', error)
        throw new Error(error.message || 'Failed to update profile')
      }
      
      console.log('Profile updated successfully:', data)
      toast.success('Profile updated successfully!')
      
      // Update local coach data with returned data
      setCoach(data)
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile: ' + (error.message || 'Unknown error'))
    } finally {
      setSavingProfile(false)
    }
  }

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

  // Group bookings by student for cleaner display
  const upcomingBookings = bookings
    ?.filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
    ?.map(booking => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Get upcoming sessions for this booking
      let upcomingSessions = []
      if (booking.recurring_dates && Array.isArray(booking.recurring_dates)) {
        upcomingSessions = booking.recurring_dates
          .filter(session => new Date(session.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      } else {
        // Single session
        if (new Date(booking.booking_date) >= today) {
          upcomingSessions = [{
            date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time
          }]
        }
      }
      
      return {
        ...booking,
        upcomingSessions,
        totalSessions: booking.recurring_dates?.length || 1,
        remainingSessions: upcomingSessions.length
      }
    })
    ?.filter(b => b.upcomingSessions.length > 0)
    ?.sort((a, b) => new Date(a.upcomingSessions[0].date) - new Date(b.upcomingSessions[0].date))
    || []

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
          
          {/* Tabs for Schedule and Profile */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="schedule" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Calendar className="w-4 h-4 mr-2" />
                My Schedule
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </TabsTrigger>
            </TabsList>
            
            {/* Schedule Tab */}
            <TabsContent value="schedule">
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
                    {upcomingBookings.map((booking) => {
                      const isExpanded = expandedBooking === booking.id
                      const firstSession = booking.upcomingSessions[0]
                      const hasMultipleSessions = booking.upcomingSessions.length > 1
                      
                      return (
                        <div
                          key={booking.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* Main Info - Always Visible */}
                          <div 
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-black text-lg">{booking.student_name}</span>
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
                                
                                {/* Schedule Summary */}
                                <div className="text-sm text-gray-600 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#5E5044]" />
                                    <span>
                                      {hasMultipleSessions 
                                        ? `${format(new Date(firstSession.date), 'EEEE')}s • ${booking.upcomingSessions.length} upcoming sessions`
                                        : `${format(new Date(firstSession.date), 'EEEE, MMM d')} • One-time`
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-4 h-4 text-[#5E5044]" />
                                    <span>{formatTime(firstSession.start_time || booking.start_time)} - {formatTime(firstSession.end_time || booking.end_time)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Button variant="ghost" size="sm" className="text-gray-400">
                                {isExpanded ? '▲' : '▼'}
                              </Button>
                            </div>
                            
                            {/* Contact Info */}
                            {booking.student_email && (
                              <div className="text-sm text-gray-500 mt-2 pt-2 border-t">
                                📧 {booking.student_email}
                                {booking.student_phone && ` • 📞 ${booking.student_phone}`}
                              </div>
                            )}
                          </div>
                          
                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t bg-gray-50">
                              {/* Upcoming Sessions List */}
                              <div className="mt-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  Upcoming Sessions ({booking.upcomingSessions.length} remaining)
                                </h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {booking.upcomingSessions.map((session, idx) => (
                                    <div 
                                      key={idx} 
                                      className="text-sm py-1 px-2 bg-white rounded border"
                                    >
                                      {format(new Date(session.date), 'EEE, MMM d, yyyy')} at {' '}
                                      {formatTime(session.start_time || booking.start_time)} - {formatTime(session.end_time || booking.end_time)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Extra Details */}
                              <div className="mt-3 pt-3 border-t text-sm text-gray-600 space-y-1">
                                <div><span className="font-medium">Booked on:</span> {format(new Date(booking.created_at), 'MMM d, yyyy')}</div>
                                {booking.course_type && <div><span className="font-medium">Course:</span> {booking.course_type}</div>}
                                {booking.monthly_amount && <div><span className="font-medium">Amount:</span> ₦{parseInt(booking.monthly_amount).toLocaleString()}</div>}
                                {booking.notes && <div><span className="font-medium">Notes:</span> {booking.notes}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                            {booking.users?.full_name || booking.users?.email || 'Unknown Student'}
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
                          <div className="font-medium text-gray-700">
                            {format(new Date(booking.session_date), 'EEE')} • {format(new Date(booking.session_date), 'MMM d, yyyy')}
                          </div>
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
            </TabsContent>
            
            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="max-w-2xl mx-auto">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Edit My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!coach ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-pulse text-gray-500">Loading profile...</div>
                      </div>
                    ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-black">Full Name *</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          placeholder="Your full name"
                          required
                          className="bg-white"
                        />
                      </div>
                      
                      {/* Specialization */}
                      <div className="space-y-2">
                        <Label htmlFor="specialization" className="text-black">Specialization</Label>
                        <Input
                          id="specialization"
                          value={profileForm.specialization}
                          onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                          placeholder="e.g., Beginner Training, Opening Theory, Endgame Mastery"
                          className="bg-white"
                        />
                      </div>
                      
                      {/* Bio */}
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-black">Bio</Label>
                        <textarea
                          id="bio"
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                          placeholder="Tell students about yourself, your teaching style, and experience..."
                          rows={4}
                          className="w-full px-3 py-2 border rounded-lg bg-white text-black"
                        />
                      </div>
                      
                      {/* Achievements */}
                      <div className="space-y-2">
                        <Label htmlFor="achievements" className="text-black">Achievements</Label>
                        <Input
                          id="achievements"
                          value={profileForm.achievements}
                          onChange={(e) => setProfileForm({ ...profileForm, achievements: e.target.value })}
                          placeholder="e.g., FIDE Master, National Champion, 2000+ Elo (comma separated)"
                          className="bg-white"
                        />
                        <p className="text-xs text-gray-500">Separate multiple achievements with commas</p>
                      </div>
                      
                      {/* Photo URL */}
                      <div className="space-y-2">
                        <Label htmlFor="photo_url" className="text-black">Profile Photo URL</Label>
                        <Input
                          id="photo_url"
                          type="url"
                          value={profileForm.photo_url}
                          onChange={(e) => setProfileForm({ ...profileForm, photo_url: e.target.value })}
                          placeholder="https://example.com/your-photo.jpg"
                          className="bg-white"
                        />
                        <p className="text-xs text-gray-500">Provide a direct link to your profile photo</p>
                      </div>
                      
                      {/* Preview */}
                      {profileForm.photo_url && (
                        <div className="space-y-2">
                          <Label className="text-black">Photo Preview</Label>
                          <div className="w-32 h-32 rounded-lg overflow-hidden border">
                            <img 
                              src={profileForm.photo_url} 
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = ''
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Email for notifications */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-black">Email for Notifications</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="coach@example.com"
                          className="bg-white"
                        />
                        <p className="text-xs text-gray-500">Used to send booking notifications</p>
                      </div>
                      
                      {/* Elite Coach Fields - Only shown for elite coaches */}
                      {coach?.is_special && (
                        <div className="space-y-6 pt-4 border-t">
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              Elite Coach Profile Fields
                            </h4>
                            <p className="text-sm text-purple-600">
                              These fields are displayed on the Special Coaches booking page.
                            </p>
                          </div>
                          
                          {/* Rank Title */}
                          <div className="space-y-2">
                            <Label htmlFor="rank_title" className="text-black">Rank / Title</Label>
                            <Input
                              id="rank_title"
                              value={profileForm.rank_title}
                              onChange={(e) => setProfileForm({ ...profileForm, rank_title: e.target.value })}
                              placeholder="e.g., FIDE Master, National Champion, Nigeria's #1"
                              className="bg-white"
                            />
                            <p className="text-xs text-gray-500">Your chess title or ranking displayed on your elite coach profile</p>
                          </div>
                          
                          {/* Special Bio */}
                          <div className="space-y-2">
                            <Label htmlFor="special_bio" className="text-black">Extended Bio</Label>
                            <textarea
                              id="special_bio"
                              value={profileForm.special_bio}
                              onChange={(e) => setProfileForm({ ...profileForm, special_bio: e.target.value })}
                              placeholder="Detailed biography for your elite coach profile page..."
                              rows={4}
                              className="w-full px-3 py-2 border rounded-lg bg-white text-black"
                            />
                            <p className="text-xs text-gray-500">Detailed bio shown on the special coaches booking page</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Save Button */}
                      <div className="pt-4">
                        <Button 
                          type="submit"
                          disabled={savingProfile}
                          className="w-full bg-[#5E5044] hover:bg-[#4a3f35]"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                        </Button>
                      </div>
                    </form>
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
