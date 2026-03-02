'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useCoach } from '@/hooks/useCoaches'
import { useCoachAvailability } from '@/hooks/useAvailability'
import { useCoachBlockedDates } from '@/hooks/useCoachBlocks'
import { useUserPoints, useCreateFlexibleBooking, useCoachBookingsForPoints } from '@/hooks/usePoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Coins, 
  Crown,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  Loader2,
  Plus,
  Minus
} from 'lucide-react'
import { format, addDays, startOfWeek, parseISO, isSameDay } from 'date-fns'
import { toast } from 'sonner'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Check if slot is blocked
function isSlotBlocked(blockedDates, date, startTime) {
  if (!blockedDates || blockedDates.length === 0) return false
  
  return blockedDates.some(block => {
    if (block.blocked_date !== date) return false
    if (!block.start_time) return true // Entire day blocked
    
    const blockStart = block.start_time.slice(0, 5)
    const blockEnd = block.end_time?.slice(0, 5) || '23:59'
    const slotStart = startTime.slice(0, 5)
    
    return slotStart >= blockStart && slotStart < blockEnd
  })
}

export default function PointsBookingClient({ coachId }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const { data: coach, isLoading: coachLoading } = useCoach(coachId)
  const { data: availability, isLoading: availLoading } = useCoachAvailability(coachId)
  const { data: blockedDates, isLoading: blocksLoading } = useCoachBlockedDates(coachId)
  const { data: existingBookings, isLoading: bookingsLoading } = useCoachBookingsForPoints(coachId)
  const { data: points, isLoading: pointsLoading } = useUserPoints(user?.id)
  const createBooking = useCreateFlexibleBooking()
  
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedSlots, setSelectedSlots] = useState([])
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
  })
  
  // Debug state to track a booked date for detailed logging
  const [debugBookedDate, setDebugBookedDate] = useState(null)
  
  // Auto-populate form with user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        studentName: user.user_metadata?.full_name || user.user_metadata?.name || '',
        studentEmail: user.email || '',
        studentPhone: user.user_metadata?.phone || user.user_metadata?.phone_number || '',
      })
    }
  }, [user])
  
  // Debug: Log existing bookings to help diagnose conflict detection issues
  useEffect(() => {
    if (existingBookings) {
      console.log('=== DEBUG: Existing bookings loaded ===')
      console.log('Total bookings:', existingBookings.length)
      console.log('Monthly bookings:', existingBookings.filter(b => b.booking_type === 'monthly').length)
      console.log('Points bookings:', existingBookings.filter(b => b.booking_type === 'points').length)
      
      // Log each monthly booking with details
      const monthlyBookings = existingBookings.filter(b => b.booking_type === 'monthly')
      monthlyBookings.forEach((b, i) => {
        console.log(`Monthly booking ${i+1}:`, {
          session_date: b.session_date,
          start_date_type: typeof b.session_date,
          start_time: b.start_time,
          start_time_type: typeof b.start_time,
          end_time: b.end_time,
          end_time_type: typeof b.end_time,
          status: b.status,
          student_name: b.student_name
        })
      })
      
      // Set the first monthly booking date for debug targeting
      if (monthlyBookings.length > 0 && monthlyBookings[0].session_date) {
        setDebugBookedDate(monthlyBookings[0].session_date)
        console.log('Debug target date set to:', monthlyBookings[0].session_date)
      }
    }
  }, [existingBookings])
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])
  
  if (authLoading || coachLoading || bookingsLoading) {
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
  
  if (!coach) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-black mb-2">Coach not found</h2>
            <Link href="/book-with-points">
              <Button className="bg-[#5E5044]">Back</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }
  
  const pointsCost = coach.points_cost || 1
  const userBalance = points?.balance || 0
  const totalCost = selectedSlots.length * pointsCost
  const canAfford = userBalance >= totalCost
  
  // Generate next 4 weeks (starting from tomorrow)
  const tomorrow = addDays(new Date(), 1)
  const weeks = Array.from({ length: 4 }, (_, i) => addDays(startOfWeek(tomorrow, { weekStartsOn: 1 }), i * 7))
  
  // Helper to format time as HH:MM string for comparison
  const formatTimeHM = (timeVal) => {
    if (!timeVal) return null
    // If it's already a string like "14:00:00" or "14:00" or "14:00:00+00"
    if (typeof timeVal === 'string') {
      // Extract HH:MM from various formats: "14:00:00", "14:00:00+00", "1970-01-01T14:00:00.000Z"
      const timeMatch = timeVal.match(/(\d{2}):(\d{2})/)
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`
      }
      return timeVal.slice(0, 5)
    }
    // If it's a Date object or timestamp
    if (timeVal instanceof Date) {
      return format(timeVal, 'HH:mm')
    }
    const strVal = String(timeVal)
    const timeMatch = strVal.match(/(\d{2}):(\d{2})/)
    return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : strVal.slice(0, 5)
  }
  
  // Check if a slot is already booked
  // All booking types only block if time overlaps (not entire day)
  const isSlotBooked = (dateStr, startTime, endTime) => {
    if (!existingBookings || existingBookings.length === 0) {
      return false
    }
    
    const slotStart = formatTimeHM(startTime)
    const slotEnd = formatTimeHM(endTime)
    
    // Debug: Log when checking the debug target date
    const isTargetDate = debugBookedDate && dateStr === debugBookedDate
    if (isTargetDate && process.env.NODE_ENV === 'development') {
      console.log(`isSlotBooked called for TARGET date ${dateStr}:`, { slotStart, slotEnd, totalBookings: existingBookings.length })
    }
    
    return existingBookings.some(booking => {
      // Handle both string and Date object formats for session_date
      const bookingDate = booking.session_date 
        ? (typeof booking.session_date === 'string' 
            ? booking.session_date 
            : format(new Date(booking.session_date), 'yyyy-MM-dd'))
        : null
      
      // Debug: Log date comparison for target date
      if (isTargetDate && process.env.NODE_ENV === 'development') {
        console.log(`  Comparing with booking:`, { 
          bookingDate, 
          targetDate: dateStr,
          dateMatch: bookingDate === dateStr,
          rawSessionDate: booking.session_date,
          rawType: typeof booking.session_date
        })
      }
      
      // Check date match
      if (bookingDate !== dateStr) {
        return false
      }
      
      // Check status - monthly bookings can be 'confirmed' or 'pending_payment'
      const validStatuses = ['confirmed', 'completed', 'pending_payment', 'payment_received']
      if (!validStatuses.includes(booking.status)) {
        if (isTargetDate && process.env.NODE_ENV === 'development') {
          console.log(`  Status rejected:`, booking.status)
        }
        return false
      }
      
      // Format booking times for comparison
      const bookingStart = formatTimeHM(booking.start_time)
      const bookingEnd = formatTimeHM(booking.end_time)
      
      // All bookings: Only block if time overlaps
      // A slot conflicts if: slotStart < bookingEnd AND slotEnd > bookingStart
      const hasOverlap = slotStart < bookingEnd && slotEnd > bookingStart
      
      if (isTargetDate && process.env.NODE_ENV === 'development') {
        console.log(`  Time comparison:`, { slotStart, slotEnd, bookingStart, bookingEnd, hasOverlap, type: booking.booking_type })
      }
      
      if (hasOverlap && process.env.NODE_ENV === 'development') {
        console.log('OVERLAP DETECTED:', { slotStart, slotEnd, bookingStart, bookingEnd, type: booking.booking_type })
      }
      
      return hasOverlap
    })
  }
  
  // Get info about what's blocking a slot (for display)
  const getSlotBlockInfo = (dateStr, startTime, endTime) => {
    if (!existingBookings) return null
    
    const slotStart = formatTimeHM(startTime)
    const slotEnd = formatTimeHM(endTime)
    
    const blocking = existingBookings.find(booking => {
      // Handle both string and Date object formats
      const bookingDate = booking.session_date 
        ? (typeof booking.session_date === 'string' 
            ? booking.session_date 
            : format(new Date(booking.session_date), 'yyyy-MM-dd'))
        : null
      
      if (bookingDate !== dateStr) return false
      
      // Check status - monthly bookings can be 'confirmed' or 'pending_payment'
      const validStatuses = ['confirmed', 'completed', 'pending_payment', 'payment_received']
      if (!validStatuses.includes(booking.status)) return false
      
      // All bookings: Check time overlap
      const bookingStart = formatTimeHM(booking.start_time)
      const bookingEnd = formatTimeHM(booking.end_time)
      
      return slotStart < bookingEnd && slotEnd > bookingStart
    })
    
    if (!blocking) return null
    
    // Return human-readable booking type
    const typeLabels = {
      'monthly': 'Monthly Class',
      'points': 'Point Booking',
      'special': 'Special Session'
    }
    
    return {
      type: blocking.booking_type || 'points',
      label: typeLabels[blocking.booking_type] || 'Booking',
      student: blocking.student_name
    }
  }
  
  // Check if a slot is blocked by coach
  // This handles both full-day blocks and partial time ranges
  // Example: Blocking 10:00-12:00 will block slots 10:00-11:00 and 11:00-12:00
  const isSlotBlocked = (dateStr, startTime, endTime) => {
    if (!blockedDates || blockedDates.length === 0) return false
    
    return blockedDates.some(block => {
      // Check if date matches
      if (block.blocked_date !== dateStr) return false
      
      // If no specific time (entire day blocked)
      if (!block.start_time || !block.end_time) return true
      
      // Format times for comparison (handle "14:30:00" or "14:30:00+00" format)
      const formatTime = (t) => t ? t.slice(0, 5) : ''
      const blockStart = formatTime(block.start_time)
      const blockEnd = formatTime(block.end_time)
      const slotStart = formatTime(startTime)
      const slotEnd = formatTime(endTime)
      
      // Overlap exists if:
      // - Slot starts before block ends AND slot ends after block starts
      // Examples:
      // Block 10:00-12:00, Slot 10:00-11:00 -> 10:00 < 12:00 && 11:00 > 10:00 = BLOCKED
      // Block 10:00-12:00, Slot 11:00-12:00 -> 11:00 < 12:00 && 12:00 > 10:00 = BLOCKED
      // Block 10:00-12:00, Slot 09:00-10:00 -> 09:00 < 12:00 && 10:00 > 10:00 = NOT BLOCKED (edge case, exactly at end)
      // Block 10:00-12:00, Slot 12:00-13:00 -> 12:00 < 12:00 = false = NOT BLOCKED
      return slotStart < blockEnd && slotEnd > blockStart
    })
  }
  
  // Check if date is in the past
  const isDateInPast = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }
  
  const getSlotsForDay = (date) => {
    // Return empty if date is in the past
    if (isDateInPast(date)) return []
    
    const dayOfWeek = date.getDay()
    const dateStr = format(date, 'yyyy-MM-dd')
    const slots = availability?.filter(slot => slot.day_of_week === dayOfWeek) || []
    
    // Filter out already booked slots AND blocked slots
    // UPDATED: Now passes end_time for proper overlap checking
    const filteredSlots = slots.filter(slot => {
      const isBooked = isSlotBooked(dateStr, slot.start_time, slot.end_time)
      const isBlocked = isSlotBlocked(dateStr, slot.start_time, slot.end_time)
      
      // Debug: Log filtering for target date
      if (debugBookedDate && dateStr === debugBookedDate && process.env.NODE_ENV === 'development') {
        console.log(`getSlotsForDay filtering ${dateStr} ${slot.start_time}:`, { isBooked, isBlocked, include: !isBooked && !isBlocked })
      }
      
      return !isBooked && !isBlocked
    })
    
    return filteredSlots
  }
  
  // Get status info for a day (for UI feedback)
  const getDayStatus = (date) => {
    if (isDateInPast(date)) return { type: 'past', message: 'Past' }
    
    const dayOfWeek = date.getDay()
    const dateStr = format(date, 'yyyy-MM-dd')
    const slots = availability?.filter(slot => slot.day_of_week === dayOfWeek) || []
    
    // Check if day is fully blocked by coach
    const isDayFullyBlocked = blockedDates?.some(b => 
      b.blocked_date === dateStr && !b.start_time
    )
    if (isDayFullyBlocked) return { type: 'blocked', message: 'Day Off' }
    
    // No availability set for this day
    if (slots.length === 0) return { type: 'no_availability', message: '—' }
    
    // Check if all slots are booked
    const availableSlots = slots.filter(slot => 
      !isSlotBooked(dateStr, slot.start_time, slot.end_time) && 
      !isSlotBlocked(dateStr, slot.start_time, slot.end_time)
    )
    
    if (availableSlots.length === 0) {
      // Check if it's due to bookings or blocks
      const hasBookings = slots.some(slot => isSlotBooked(dateStr, slot.start_time, slot.end_time))
      const hasBlocks = slots.some(slot => isSlotBlocked(dateStr, slot.start_time, slot.end_time))
      
      if (hasBookings) return { type: 'fully_booked', message: 'Fully Booked' }
      if (hasBlocks) return { type: 'partially_blocked', message: 'Blocked' }
    }
    
    return { type: 'available', message: '' }
  }
  
  const isSlotSelected = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => 
      s.date === dateStr && s.start_time === slot.start_time
    )
  }
  
  const toggleSlot = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    if (isSlotSelected(date, slot)) {
      setSelectedSlots(selectedSlots.filter(s => 
        !(s.date === dateStr && s.start_time === slot.start_time)
      ))
    } else {
      if (selectedSlots.length >= 10) {
        toast.error('You can book up to 10 sessions at a time')
        return
      }
      setSelectedSlots([...selectedSlots, {
        date: dateStr,
        start_time: slot.start_time,
        end_time: slot.end_time,
        day_of_week: date.getDay()
      }])
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one time slot')
      return
    }
    
    if (!canAfford) {
      toast.error(`You need ${totalCost} points but only have ${userBalance}`)
      return
    }
    
    try {
      // Create bookings for all selected slots
      const bookings = []
      for (const slot of selectedSlots) {
        const booking = await createBooking.mutateAsync({
          userId: user.id,
          coachId: coachId,
          sessionDate: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          dayOfWeek: slot.day_of_week,
          pointsUsed: pointsCost,
          meetingLink: coach.meeting_link,
        })
        bookings.push(booking)
      }
      
      // Send emails for each booking (single API call sends to both student and coach)
      const newBalance = userBalance - totalCost
      
      // Helper to delay between requests
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
      
      for (let i = 0; i < bookings.length; i++) {
        const slot = selectedSlots[i]
        
        // Add delay between email requests to respect rate limit (600ms = ~1.6 req/sec)
        if (i > 0) {
          await delay(600)
        }
        
        try {
          await fetch('/api/points-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'flexibleBookingConfirmed',
              data: {
                student_name: formData.studentName,
                student_email: formData.studentEmail,
                coach_name: coach.name,
                coach_email: coach.email,
                session_date: slot.date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                points_used: pointsCost,
                remaining_balance: newBalance + (selectedSlots.length - i - 1) * pointsCost,
                meeting_link: coach.meeting_link,
                student_phone: formData.studentPhone,
              }
            })
          })
        } catch (e) {
          console.error('Failed to send booking emails:', e)
        }
      }
      
      toast.success(`Successfully booked ${selectedSlots.length} session(s)!`)
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to book: ' + error.message)
    }
  }
  
  const initials = coach.name.split(' ').map(n => n[0]).join('').toUpperCase()
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/book-with-points" className="flex items-center text-[#5E5044] hover:underline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Coaches
            </Link>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8">
          {/* Coach Info */}
          <Card className={`mb-8 ${coach.is_special ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gradient-to-r from-[#5E5044] to-[#7a6b5c]'} text-white`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
                <div className="flex-1">
                  {coach.is_special && (
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold">{coach.rank_title || 'Elite Coach'}</span>
                    </div>
                  )}
                  <h1 className="text-2xl font-bold">{coach.name}</h1>
                  <p className="text-gray-200">{coach.specialization}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-2xl font-bold">
                      <Coins className="w-6 h-6" />
                      {pointsCost}
                    </div>
                    <div className="text-sm text-gray-200">points/class</div>
                  </div>
                  <div className="text-center bg-white/20 px-4 py-2 rounded-lg">
                    <div className="text-sm text-gray-200">Your Balance</div>
                    <div className={`text-xl font-bold ${canAfford ? 'text-green-300' : 'text-red-300'}`}>
                      {userBalance} pts
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {!canAfford && selectedSlots.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Insufficient Points</p>
                <p className="text-red-600 text-sm">
                  You need {totalCost} points but only have {userBalance}.
                </p>
              </div>
              <Link href="/buy-points">
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Buy Points
                </Button>
              </Link>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Calendar */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Select Time Slots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {availLoading || blocksLoading || bookingsLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                      </div>
                    ) : availability?.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600">This coach has no availability set.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {weeks.map((weekStart, weekIdx) => (
                          <div key={weekIdx} className="border rounded-lg p-4">
                            <h4 className="font-semibold text-black mb-3">
                              Week of {format(weekStart, 'MMM d, yyyy')}
                            </h4>
                            <div className="grid grid-cols-7 gap-2">
                              {Array.from({ length: 7 }, (_, dayIdx) => {
                                const date = addDays(weekStart, dayIdx)
                                const dateStr = format(date, 'yyyy-MM-dd')
                                const slots = getSlotsForDay(date)
                                const dayStatus = getDayStatus(date)
                                
                                return (
                                  <div key={dayIdx} className="min-h-[100px] p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500 mb-1">
                                      {DAYS_OF_WEEK[date.getDay()]}
                                    </div>
                                    <div className="text-sm font-semibold text-black mb-2">
                                      {format(date, 'd')}
                                    </div>
                                    
                                    {dayStatus.type === 'blocked' ? (
                                      <div className="text-xs text-red-500 font-medium">Day Off</div>
                                    ) : dayStatus.type === 'fully_booked' ? (
                                      <div className="text-xs text-orange-500 font-medium">Fully Booked</div>
                                    ) : dayStatus.type === 'past' ? (
                                      <div className="text-xs text-gray-400">—</div>
                                    ) : slots.length > 0 ? (
                                      <div className="space-y-1">
                                        {slots.map((slot, idx) => {
                                          const selected = isSlotSelected(date, slot)
                                          
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => toggleSlot(date, slot)}
                                              className={`w-full text-xs py-1 px-1 rounded transition-colors ${
                                                selected
                                                  ? 'bg-[#5E5044] text-white'
                                                  : 'bg-white hover:bg-[#F5EFE7] border border-gray-200'
                                              }`}
                                            >
                                              {selected ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                              {slot.start_time.slice(0, 5)}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <span className={`text-xs ${dayStatus.type === 'partially_blocked' ? 'text-orange-400' : 'text-gray-400'}`}>
                                        {dayStatus.message}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Contact Info - Pre-filled from profile */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Information</CardTitle>
                    <p className="text-sm text-gray-500">Pre-filled from your profile</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        required
                        className="mt-1 bg-gray-50"
                        placeholder="Your name from profile"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.studentEmail}
                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                        required
                        className="mt-1 bg-gray-50"
                        placeholder="Your email from profile"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.studentPhone}
                        onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                        required
                        className="mt-1 bg-gray-50"
                        placeholder={formData.studentPhone ? '' : 'Add phone number to your profile'}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Summary Sidebar */}
              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coach</span>
                      <span className="font-medium text-black">{coach.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost per class</span>
                      <span className="font-medium text-black">{pointsCost} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sessions</span>
                      <span className="font-medium text-black">{selectedSlots.length}</span>
                    </div>
                    
                    {selectedSlots.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded p-2">
                        {selectedSlots.map((slot, idx) => (
                          <div key={idx} className="text-xs py-1 border-b last:border-0">
                            {idx + 1}. {format(parseISO(slot.date), 'MMM d')} at {slot.start_time.slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-black">Total Cost</span>
                        <span className="text-2xl font-bold text-[#5E5044]">
                          {totalCost} pts
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-600">Your balance</span>
                        <span className={`font-medium ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                          {userBalance} pts
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={
                        createBooking.isPending ||
                        selectedSlots.length === 0 ||
                        !canAfford ||
                        !formData.studentName ||
                        !formData.studentEmail ||
                        !formData.studentPhone
                      }
                      className="w-full bg-[#5E5044] hover:bg-[#4a3f35] py-6 text-lg"
                    >
                      {createBooking.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Booking...
                        </>
                      ) : !canAfford ? (
                        'Insufficient Points'
                      ) : (
                        `Book ${selectedSlots.length} Session(s)`
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Cancel up to 24 hours before for full refund
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}
