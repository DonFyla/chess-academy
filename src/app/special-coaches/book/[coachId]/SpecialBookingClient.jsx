'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, addDays, startOfWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Loader2, ArrowLeft, Crown, Calendar, Plus, Minus, Clock, CheckCircle, CreditCard, AlertCircle, MessageCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSpecialCoach, useCreateSpecialBooking } from '@/hooks/useSpecialCoaches'
import { useCoachAvailability } from '@/hooks/useAvailability'
import { useCoachBlockedDates } from '@/hooks/useCoachBlocks'
import { useAuth } from '@/contexts/AuthContext'
import { usePaystackPayment } from '@/hooks/usePaystack'
import { supabase } from '@/lib/supabase'

// Helper to format time as HH:MM for comparison
const formatTimeHM = (timeVal) => {
  if (!timeVal) return null
  if (typeof timeVal === 'string') {
    const timeMatch = timeVal.match(/(\d{2}):(\d{2})/)
    if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`
    return timeVal.slice(0, 5)
  }
  if (timeVal instanceof Date) return format(timeVal, 'HH:mm')
  const strVal = String(timeVal)
  const timeMatch = strVal.match(/(\d{2}):(\d{2})/)
  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : strVal.slice(0, 5)
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Check if a slot is already booked (from special bookings or points bookings)
const isSlotBooked = (dateStr, startTime, endTime, existingBookings) => {
  if (!existingBookings || existingBookings.length === 0) return false
  
  const slotStart = formatTimeHM(startTime)
  const slotEnd = formatTimeHM(endTime)
  
  const isBooked = existingBookings.some(booking => {
    // Handle date format - special bookings use 'date', flexible bookings use 'session_date'
    const rawDate = booking.date || booking.session_date
    if (!rawDate) return false
    
    const bookingDate = typeof rawDate === 'string' 
      ? rawDate 
      : format(new Date(rawDate), 'yyyy-MM-dd')
    
    if (bookingDate !== dateStr) return false
    
    // Check status - only block confirmed/pending bookings
    const validStatuses = ['confirmed', 'completed', 'pending_payment', 'payment_received']
    if (!validStatuses.includes(booking.status)) return false
    
    // Check time overlap
    const bookingStart = formatTimeHM(booking.start_time)
    const bookingEnd = formatTimeHM(booking.end_time)
    
    const hasOverlap = slotStart < bookingEnd && slotEnd > bookingStart
    
    if (hasOverlap) {
      console.log('[isSlotBooked] Found conflict:', {
        date: dateStr,
        slot: `${slotStart}-${slotEnd}`,
        booking: `${bookingStart}-${bookingEnd}`,
        type: booking.booking_type
      })
    }
    
    return hasOverlap
  })
  
  return isBooked
}

// Check if a slot is blocked by coach
const isSlotBlockedByCoach = (dateStr, startTime, endTime, blockedDates) => {
  if (!blockedDates || blockedDates.length === 0) return false
  
  return blockedDates.some(block => {
    if (block.blocked_date !== dateStr) return false
    if (!block.start_time || !block.end_time) return true
    
    const blockStart = formatTimeHM(block.start_time)
    const blockEnd = formatTimeHM(block.end_time)
    const slotStart = formatTimeHM(startTime)
    const slotEnd = formatTimeHM(endTime)
    
    return slotStart < blockEnd && slotEnd > blockStart
  })
}

export default function SpecialBookingClient({ coachId }) {
  const router = useRouter()
  const { user } = useAuth() // Optional - for pre-filling if logged in
  const { data: coach, isLoading: loadingCoach } = useSpecialCoach(coachId)
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(coachId)
  const { data: blockedDates = [] } = useCoachBlockedDates(coachId)
  const createBooking = useCreateSpecialBooking()
  const { initializePayment, isLoading: paystackLoading } = usePaystackPayment()
  
  // Fetch existing bookings using unified schedule function (works for anonymous users too)
  const { data: existingBookings = [], error: bookingsError } = useQuery({
    queryKey: ['all-bookings-conflicts', coachId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      console.log('[SpecialBooking] Fetching unified schedule for coach:', coachId)
      
      // Use the unified schedule function that bypasses RLS and includes all booking types
      const { data, error } = await supabase
        .rpc('get_coach_unified_schedule', {
          p_coach_id: coachId,
          p_start_date: today,
          p_days_ahead: 365
        })
      
      if (error) {
        console.error('[SpecialBooking] Error fetching unified schedule:', error)
        throw error
      }
      
      console.log('[SpecialBooking] Unified schedule bookings found:', data?.length || 0)
      console.log('[SpecialBooking] Points bookings:', data?.filter(b => b.booking_type === 'points').length || 0)
      
      // Map to the format expected by isSlotBooked
      const mappedBookings = (data || []).map(booking => ({
        session_date: booking.session_date,
        date: booking.session_date, // for compatibility
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        booking_type: booking.booking_type
      }))
      
      return mappedBookings
    },
    enabled: !!coachId,
  })
  
  // Form state
  const [step, setStep] = useState('form') // 'form' or 'confirm'
  const [totalSessions, setTotalSessions] = useState(4)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
  })
  
  // Auto-populate form with user data when available (optional - guests can book too)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        studentName: user.user_metadata?.full_name || user.user_metadata?.name || prev.studentName,
        studentEmail: user.email || prev.studentEmail,
        studentPhone: user.user_metadata?.phone || user.user_metadata?.phone_number || prev.studentPhone,
      }))
    }
  }, [user])
  
  const hourlyRate = coach?.hourly_rate || 15000
  const totalAmount = hourlyRate * totalSessions
  
  // Generate next 4 weeks
  const tomorrow = addDays(new Date(), 1)
  const weeks = Array.from({ length: 4 }, (_, i) => addDays(startOfWeek(tomorrow, { weekStartsOn: 1 }), i * 7))
  
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
      if (selectedSlots.length >= totalSessions) {
        toast.error(`You can only select ${totalSessions} sessions`)
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
  
  const handleProceedToConfirm = (e) => {
    e.preventDefault()
    
    if (selectedSlots.length !== totalSessions) {
      toast.error(`Please select exactly ${totalSessions} sessions`)
      return
    }
    
    if (!formData.studentName || !formData.studentEmail || !formData.studentPhone) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setStep('confirm')
    window.scrollTo(0, 0)
  }
  
  const handleConfirmBooking = async () => {
    try {
      const ref = `SPEC-${Date.now().toString(36).toUpperCase()}`
      
      const booking = {
        coach_id: coachId,
        student_name: formData.studentName,
        student_email: formData.studentEmail,
        student_phone: formData.studentPhone,
        total_sessions: totalSessions,
        session_dates: selectedSlots,
        is_recurring: false,
        recurring_days: [],
        hourly_rate: hourlyRate,
        total_amount: totalAmount,
        status: 'pending_payment',
        payment_reference: ref,
      }
      
      const result = await createBooking.mutateAsync(booking)
      
      await initializePayment({
        email: formData.studentEmail,
        amount: totalAmount,
        reference: ref,
        metadata: {
          type: 'special_booking',
          booking_id: result?.id || result?.[0]?.id,
          table: 'special_bookings',
        },
        onSuccess: (transaction) => {
          toast.success('Payment successful! Your booking is confirmed.')
          router.push('/special-coaches?booked=true')
        },
        onCancel: () => {
          toast.info('Payment cancelled. Your booking is reserved for 48 hours.')
        },
      })
    } catch (error) {
      console.error('Booking error:', error)
      toast.error('Failed to create booking: ' + error.message)
    }
  }
  
  if (loadingCoach) {
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
            <h2 className="text-xl font-semibold text-black mb-2">Coach not found</h2>
            <Link href="/special-coaches">
              <Button className="bg-[#5E5044]">Back to Special Coaches</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }
  
  const initials = coach.name.split(' ').map(n => n[0]).join('').toUpperCase()
  
  // Confirmation Step
  if (step === 'confirm') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7]">
          <header className="bg-white border-b">
            <div className="container mx-auto px-4 py-4">
              <Link href="/special-coaches" className="flex items-center text-[#5E5044] hover:underline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Elite Coaches
              </Link>
            </div>
          </header>
          
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card className="mb-6">
              <CardHeader className="bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-[#5E5044] text-lg sm:text-xl font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <CardTitle className="text-white text-base sm:text-lg">Review Your Booking</CardTitle>
                    <p className="text-gray-200 text-xs sm:text-sm">Special Coaching Session</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Coach Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#F5EFE7] rounded-lg gap-3 sm:gap-0">
                  <div>
                    <p className="text-sm text-gray-600">Coach</p>
                    <p className="font-semibold text-black flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-600" />
                      {coach.name}
                    </p>
                    <p className="text-sm text-gray-500">{coach.rank_title || 'Elite Coach'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="font-semibold text-black">₦{hourlyRate.toLocaleString()}/session</p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Student Name</p>
                    <p className="font-medium text-black">{formData.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-black">{formData.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-black">{formData.studentPhone}</p>
                  </div>
                </div>

                {/* Sessions */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Sessions ({selectedSlots.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {selectedSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                        <Calendar className="w-4 h-4 text-[#5E5044]" />
                        <span className="text-black">
                          {format(parseISO(slot.date), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="text-gray-400">|</span>
                        <Clock className="w-4 h-4 text-[#5E5044]" />
                        <span className="text-black">
                          {formatTimeHM(slot.start_time)} - {formatTimeHM(slot.end_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="text-2xl font-bold text-[#5E5044]">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Notice */}
            <Card className="mb-6 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <CreditCard className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-gray-700">
                  Please complete payment to confirm your booking. You will be redirected to our secure payment partner.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Your spot is held for 48 hours. Please complete payment within this time to secure your booking.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
                disabled={createBooking.isPending || paystackLoading}
                className="flex-1 py-5 sm:py-6 order-2 sm:order-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={handleConfirmBooking}
                disabled={createBooking.isPending || paystackLoading}
                className="flex-1 bg-[#5E5044] hover:bg-[#4a3f35] py-5 sm:py-6 text-base sm:text-lg order-1 sm:order-2"
              >
                {createBooking.isPending || paystackLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Pay & Book
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }
  
  // Form Step
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/special-coaches" className="flex items-center text-[#5E5044] hover:underline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Elite Coaches
            </Link>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8">
          {/* Coach Info */}
          <Card className={`mb-8 ${coach.is_special ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gradient-to-r from-[#5E5044] to-[#7a6b5c]'} text-white`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  {coach.is_special && (
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                      <span className="font-semibold text-sm sm:text-base">{coach.rank_title || 'Elite Coach'}</span>
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl font-bold">{coach.name}</h1>
                  <p className="text-gray-200 text-sm sm:text-base">{coach.specialization}</p>
                </div>
                <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold">₦{hourlyRate.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm text-gray-200">per session</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <form onSubmit={handleProceedToConfirm}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Session Count */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-sm">1</span>
                      How Many Sessions?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (totalSessions > 1) {
                            setTotalSessions(totalSessions - 1)
                            setSelectedSlots([])
                          }
                        }}
                        className="w-12 h-12 rounded-full border-2 border-[#5E5044] flex items-center justify-center text-[#5E5044] hover:bg-[#F5EFE7]"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-center min-w-[100px]">
                        <div className="text-4xl font-bold text-black">{totalSessions}</div>
                        <div className="text-gray-500">sessions</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTotalSessions(totalSessions + 1)
                          setSelectedSlots([])
                        }}
                        className="w-12 h-12 rounded-full border-2 border-[#5E5044] flex items-center justify-center text-[#5E5044] hover:bg-[#F5EFE7]"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      Tip: Book 8+ sessions for 10% discount
                    </p>
                  </CardContent>
                </Card>
                
                {/* Step 2: Schedule Sessions - Calendar Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-sm">2</span>
                      Choose Your Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAvailability ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5E5044]" />
                      </div>
                    ) : availability.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>This coach has no availability set.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Week Navigator */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setCurrentWeek(prev => addDays(prev, -7))}
                            className="w-full sm:w-auto px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 text-black"
                          >
                            ← Previous
                          </button>
                          <span className="text-sm font-medium text-black order-first sm:order-none">
                            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentWeek(prev => addDays(prev, 7))}
                            className="w-full sm:w-auto px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 text-black"
                          >
                            Next →
                          </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="border rounded-lg p-3 sm:p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {Array.from({ length: 7 }, (_, dayIdx) => {
                              const date = addDays(currentWeek, dayIdx)
                              const dateStr = format(date, 'yyyy-MM-dd')
                              const dayOfWeek = date.getDay()
                              
                              // Get all slots for this day
                              const allSlots = availability.filter(slot => slot.day_of_week === dayOfWeek)
                              
                              // Filter out booked/blocked slots
                              const availableSlots = allSlots.filter(slot => 
                                !isSlotBooked(dateStr, slot.start_time, slot.end_time, existingBookings) &&
                                !isSlotBlockedByCoach(dateStr, slot.start_time, slot.end_time, blockedDates)
                              )
                              
                              // Check if day is in the past
                              const isPast = (() => {
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                return date < today
                              })()
                              
                              const isDayFullyBlocked = blockedDates?.some(b => 
                                b.blocked_date === dateStr && !b.start_time
                              )
                              
                              const hasAnySlots = allSlots.length > 0
                              const hasAvailableSlots = availableSlots.length > 0
                              const hasBookings = allSlots.some(slot => 
                                isSlotBooked(dateStr, slot.start_time, slot.end_time, existingBookings)
                              )
                              
                              // Determine what to show
                              let dayContent
                              if (!hasAnySlots) {
                                dayContent = <span className="text-xs text-gray-400">—</span>
                              } else if (!hasAvailableSlots && hasBookings) {
                                dayContent = <div className="text-xs text-orange-500 font-medium">Fully Booked</div>
                              } else if (isDayFullyBlocked) {
                                dayContent = <div className="text-xs text-red-500 font-medium">Day Off</div>
                              } else if (!hasAvailableSlots) {
                                dayContent = <span className="text-xs text-orange-400">Blocked</span>
                              } else if (isPast) {
                                dayContent = <div className="text-xs text-gray-400">—</div>
                              } else {
                                dayContent = (
                                  <div className="space-y-1">
                                    {availableSlots.map((slot, idx) => {
                                      const selected = isSlotSelected(date, slot)
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => toggleSlot(date, slot)}
                                          className={`w-full text-xs py-2 sm:py-1 px-2 sm:px-1 rounded transition-colors ${
                                            selected
                                              ? 'bg-[#5E5044] text-white'
                                              : 'bg-white hover:bg-[#F5EFE7] border border-gray-200'
                                          }`}
                                        >
                                          {selected ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                          {formatTimeHM(slot.start_time)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )
                              }
                              
                              return (
                                <div key={dayIdx} className="min-h-[120px] sm:min-h-[100px] p-2 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-500 mb-1">
                                    {DAYS_OF_WEEK[date.getDay()]}
                                  </div>
                                  <div className="text-sm font-semibold text-black mb-2">
                                    {format(date, 'd')}
                                  </div>
                                  {dayContent}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Step 3: Your Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-sm">3</span>
                      Your Information
                    </CardTitle>
                    <p className="text-sm text-gray-500">Pre-filled from your profile</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-black">Full Name *</Label>
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
                      <Label htmlFor="email" className="text-black">Email Address *</Label>
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
                      <Label htmlFor="phone" className="text-black">Phone Number *</Label>
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
              
              {/* Sidebar - Summary */}
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
                      <span className="text-gray-600">Sessions</span>
                      <span className="font-medium text-black">{totalSessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rate per session</span>
                      <span className="font-medium text-black">₦{hourlyRate.toLocaleString()}</span>
                    </div>
                    
                    {selectedSlots.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-gray-600 mb-2">Schedule:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedSlots.map((slot, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              {idx + 1}. {format(parseISO(slot.date), 'MMM d')} at {formatTimeHM(slot.start_time)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-black">Total</span>
                        <span className="text-2xl font-bold text-[#5E5044]">
                          ₦{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={selectedSlots.length !== totalSessions}
                      className="w-full bg-[#5E5044] hover:bg-[#4a3f35] py-5 sm:py-6 text-base sm:text-lg"
                    >
                      Review & Confirm
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      You&apos;ll review payment details on the next step
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
