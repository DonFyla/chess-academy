'use client'

import { useState } from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DAYS_OF_WEEK, COURSE_TYPES } from '@/lib/scheduling-types'
import { useCreateBooking } from '@/hooks/useBookings'
import { toast } from 'sonner'

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function BookingForm({ coachId, availability, existingBookings, coachName }) {
  const [bookingMode, setBookingMode] = useState('single') // 'single' (4 sessions) or 'double' (8 sessions)
  
  // Selected days and times (recurring weekly)
  const [selectedDay1, setSelectedDay1] = useState(null)
  const [selectedSlot1, setSelectedSlot1] = useState(null)
  const [selectedDay2, setSelectedDay2] = useState(null)
  const [selectedSlot2, setSelectedSlot2] = useState(null)
  
  // Student info
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [courseType, setCourseType] = useState('')
  const [notes, setNotes] = useState('')
  
  const createBooking = useCreateBooking()

  // Get available days of week from availability
  const availableDaysOfWeek = [...new Set(availability.map((s) => s.day_of_week))]

  // Get slots for a specific day of week
  const getSlotsForDay = (dayOfWeek) => {
    if (dayOfWeek === null) return []
    return availability.filter((slot) => slot.day_of_week === dayOfWeek)
  }

  const slotsForDay1 = getSlotsForDay(selectedDay1)
  const slotsForDay2 = getSlotsForDay(selectedDay2)

  // Check if a specific time slot conflicts with an existing booking
  const isSlotBooked = (dayOfWeek, slot) => {
    if (!slot) return false
    
    return existingBookings.some(
      (b) =>
        b.recurring_days &&
        b.recurring_days.includes(dayOfWeek) &&
        b.status !== 'rejected' &&
        b.status !== 'cancelled' &&
        // Check for time overlap
        b.start_time < slot.end_time &&
        b.end_time > slot.start_time
    )
  }

  // Check if a day has ANY available slots (used to disable days with no free slots)
  const isDayFullyBooked = (dayOfWeek) => {
    const daySlots = availability.filter((s) => s.day_of_week === dayOfWeek)
    if (daySlots.length === 0) return true
    
    // Day is fully booked if ALL its slots are taken
    return daySlots.every((slot) => isSlotBooked(dayOfWeek, slot))
  }

  // Calculate total price
  const calculatePrice = () => {
    const pricePerSession = 15000 // ₦15,000 per session
    const sessionsCount = bookingMode === 'single' ? 4 : 8
    
    if (bookingMode === 'single') {
      return pricePerSession * sessionsCount
    } else {
      // Twice a week gets a 5% discount
      return (pricePerSession * sessionsCount) * 0.95
    }
  }
  
  const SESSIONS_COUNT = {
    single: 4,
    double: 8
  }

  // Generate recurring dates for the month
  const generateRecurringDates = () => {
    const dates = []
    const today = new Date()
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 })
    
    // Generate 4 weeks of dates
    for (let week = 0; week < 4; week++) {
      const weekStart = addWeeks(startOfCurrentWeek, week)
      
      // Add first selected day
      if (selectedDay1 !== null) {
        const date1 = addDays(weekStart, selectedDay1)
        if (date1 > today) {
          dates.push({
            date: format(date1, 'yyyy-MM-dd'),
            start_time: selectedSlot1.start_time,
            end_time: selectedSlot1.end_time,
            // day_of_week removed - using recurring_days instead
          })
        }
      }
      
      // Add second selected day (if twice a week)
      if (bookingMode === 'double' && selectedDay2 !== null) {
        const date2 = addDays(weekStart, selectedDay2)
        if (date2 > today) {
          dates.push({
            date: format(date2, 'yyyy-MM-dd'),
            start_time: selectedSlot2.start_time,
            end_time: selectedSlot2.end_time,
            // day_of_week removed - using recurring_days instead
          })
        }
      }
    }
    
    return dates
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    if (selectedDay1 === null || !selectedSlot1 || !studentName || !studentEmail) {
      toast.error('Please fill in all required fields')
      return
    }

    if (bookingMode === 'double' && (selectedDay2 === null || !selectedSlot2)) {
      toast.error('Please select both days for twice-a-week booking')
      return
    }

    try {
      const recurringDates = generateRecurringDates()
      const monthlyPrice = calculatePrice()
      
      // Create ONE booking with recurring dates stored as JSON
      await createBooking.mutateAsync({
        coach_id: coachId,
        student_name: studentName,
        student_email: studentEmail,
        student_phone: studentPhone || null,
        booking_date: recurringDates[0]?.date, // First session date
        start_time: selectedSlot1.start_time,
        end_time: selectedSlot1.end_time,

        recurring_days: bookingMode === 'double' ? [selectedDay1, selectedDay2] : [selectedDay1],
        recurring_dates: recurringDates,
        monthly_amount: monthlyPrice,
        sessions_per_month: bookingMode === 'single' ? 4 : 8,
        booking_mode: bookingMode,
        notes: notes || null,
        course_type: courseType || null,
      })
      
      toast.success(`Booking submitted! Check your email for payment details. Total: ₦${monthlyPrice.toLocaleString()}`)
      
      // Reset form
      setSelectedDay1(null)
      setSelectedSlot1(null)
      setSelectedDay2(null)
      setSelectedSlot2(null)
      setStudentName('')
      setStudentEmail('')
      setStudentPhone('')
      setCourseType('')
      setNotes('')
      setBookingMode('single')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.message || 'Failed to submit booking. Please try again.')
    }
  }

  const canShowStudentForm = bookingMode === 'single' 
    ? selectedDay1 !== null && selectedSlot1
    : selectedDay1 !== null && selectedSlot1 && selectedDay2 !== null && selectedSlot2

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Booking Mode Selection */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg text-black">How Many Sessions Per Week?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button
              type="button"
              variant={bookingMode === 'single' ? 'default' : 'outline'}
              onClick={() => setBookingMode('single')}
              className={bookingMode === 'single' ? 'bg-[#5E5044]' : 'border-[#5E5044] text-[#5E5044]'}
            >
              Once a Week (4 sessions/month)
            </Button>
            <Button
              type="button"
              variant={bookingMode === 'double' ? 'default' : 'outline'}
              onClick={() => setBookingMode('double')}
              className={bookingMode === 'double' ? 'bg-[#5E5044]' : 'border-[#5E5044] text-[#5E5044]'}
            >
              Twice a Week (8 sessions/month)
            </Button>
          </div>
          <div className="text-sm text-gray-600 mt-3 space-y-1">
            <p><strong>₦15,000</strong> per session</p>
            {bookingMode === 'single' ? (
              <p>Total: <strong>₦60,000</strong> for 4 sessions</p>
            ) : (
              <p>Total: <strong>₦114,000</strong> for 8 sessions (5% discount applied)</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session 1 */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg text-black">
            1. Select First Weekly Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS_OF_WEEK.map((day, index) => {
              const isAvailable = availableDaysOfWeek.includes(index)
              const isFullyBooked = isDayFullyBooked(index)
              const isSelected = selectedDay1 === index
              
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!isAvailable || isFullyBooked}
                  onClick={() => {
                    setSelectedDay1(index)
                    setSelectedSlot1(null)
                  }}
                  className={`
                    p-3 rounded-lg text-sm font-medium transition-colors
                    ${isSelected 
                      ? 'bg-[#5E5044] text-white' 
                      : isFullyBooked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isAvailable
                          ? 'bg-white border border-[#5E5044] text-[#5E5044] hover:bg-[#F5EFE7]'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {day.slice(0, 3)}
                  {isFullyBooked && <span className="block text-xs">Full</span>}
                </button>
              )
            })}
          </div>
          
          {selectedDay1 !== null && (
            <div className="mt-4">
              <Label className="text-black mb-2 block">Select Time for {DAYS_OF_WEEK[selectedDay1]}</Label>
              <div className="flex flex-wrap gap-2">
                {slotsForDay1.map((slot) => {
                  const slotBooked = isSlotBooked(selectedDay1, slot)
                  return (
                    <Badge
                      key={slot.id}
                      variant={selectedSlot1?.id === slot.id ? 'default' : 'outline'}
                      className={`py-2 px-3 text-sm ${
                        selectedSlot1?.id === slot.id 
                          ? 'bg-[#5E5044] text-white cursor-pointer' 
                          : slotBooked
                            ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-[#5E5044] hover:text-white border-[#5E5044] text-[#5E5044]'
                      }`}
                      onClick={() => !slotBooked && setSelectedSlot1(slot)}
                    >
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      {slotBooked && ' (Booked)'}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session 2 (Only for twice a week) */}
      {bookingMode === 'double' && (
        <Card className="bg-white border-2 border-dashed border-[#5E5044]/30">
          <CardHeader>
            <CardTitle className="text-lg text-black">
              2. Select Second Weekly Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {DAYS_OF_WEEK.map((day, index) => {
                const isAvailable = availableDaysOfWeek.includes(index)
                const isFullyBooked = isDayFullyBooked(index)
                const isSelected = selectedDay2 === index
                const isSameAsDay1 = index === selectedDay1
                
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!isAvailable || isFullyBooked || isSameAsDay1}
                    onClick={() => {
                      setSelectedDay2(index)
                      setSelectedSlot2(null)
                    }}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-colors
                      ${isSelected 
                        ? 'bg-[#5E5044] text-white' 
                        : isSameAsDay1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isFullyBooked
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isAvailable
                              ? 'bg-white border border-[#5E5044] text-[#5E5044] hover:bg-[#F5EFE7]'
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }
                    `}
                  >
                    {day.slice(0, 3)}
                    {isSameAsDay1 && <span className="block text-xs">Used</span>}
                    {isFullyBooked && <span className="block text-xs">Full</span>}
                  </button>
                )
              })}
            </div>
            
            {selectedDay2 !== null && (
              <div className="mt-4">
                <Label className="text-black mb-2 block">Select Time for {DAYS_OF_WEEK[selectedDay2]}</Label>
                <div className="flex flex-wrap gap-2">
                  {slotsForDay2.map((slot) => {
                    const slotBooked = isSlotBooked(selectedDay2, slot)
                    return (
                      <Badge
                        key={slot.id}
                        variant={selectedSlot2?.id === slot.id ? 'default' : 'outline'}
                        className={`py-2 px-3 text-sm ${
                          selectedSlot2?.id === slot.id 
                            ? 'bg-[#5E5044] text-white cursor-pointer' 
                            : slotBooked
                              ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-[#5E5044] hover:text-white border-[#5E5044] text-[#5E5044]'
                        }`}
                        onClick={() => !slotBooked && setSelectedSlot2(slot)}
                      >
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        {slotBooked && ' (Booked)'}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Information */}
      {canShowStudentForm && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-black">
              {bookingMode === 'single' ? '2' : '3'}. Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Booking Summary */}
            <div className="bg-[#F5EFE7] p-4 rounded-lg mb-4">
              <h4 className="font-medium text-[#5E5044] mb-2">Booking Summary:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Coach:</strong> {coachName}</p>
                <p><strong>Schedule:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>{DAYS_OF_WEEK[selectedDay1]}s at {selectedSlot1 && formatTime(selectedSlot1.start_time)}</li>
                  {bookingMode === 'double' && selectedDay2 !== null && (
                    <li>{DAYS_OF_WEEK[selectedDay2]}s at {selectedSlot2 && formatTime(selectedSlot2.start_time)}</li>
                  )}
                </ul>
                <p><strong>Total Sessions:</strong> {SESSIONS_COUNT[bookingMode]}</p>
                <p className="text-lg font-bold text-[#5E5044] mt-2">
                  Amount Due: ₦{calculatePrice().toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black">Your Name *</Label>
                <Input
                  id="name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Your Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="border-gray-300"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-black">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="+234..."
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course" className="text-black">Course Type</Label>
                <select
                  id="course"
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                >
                  <option value="">Select a course</option>
                  {COURSE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-black">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any questions or topics you'd like to discuss..."
                rows={3}
                className="border-gray-300"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#5E5044] hover:bg-[#4a3f35] text-white"
              disabled={createBooking.isPending}
            >
              {createBooking.isPending 
                ? 'Submitting...' 
                : `Complete Booking - ₦${calculatePrice().toLocaleString()}`
              }
            </Button>
            
            <p className="text-sm text-gray-500 text-center">
              You'll receive an email with our bank details and WhatsApp link to confirm your payment.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
