'use client'

import { useState } from 'react'
import { format, isSameDay, isPast, startOfToday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
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
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [courseType, setCourseType] = useState('')
  const [notes, setNotes] = useState('')
  
  const createBooking = useCreateBooking()

  // Get available days of week from availability
  const availableDaysOfWeek = [...new Set(availability.map((s) => s.day_of_week))]

  // Disable dates that don't have availability or are in the past
  const disabledDays = (date) => {
    const dayOfWeek = date.getDay()
    const today = startOfToday()
    const isPastDate = date < today
    return isPastDate || !availableDaysOfWeek.includes(dayOfWeek)
  }

  // Get slots for selected date
  const slotsForDate = selectedDate
    ? availability.filter((slot) => slot.day_of_week === selectedDate.getDay())
    : []

  // Check if a slot is already booked
  const isSlotBooked = (slot, date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return existingBookings.some(
      (b) =>
        b.booking_date === dateStr &&
        b.start_time === slot.start_time &&
        b.status !== 'rejected' &&
        b.status !== 'cancelled'
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedDate || !selectedSlot || !studentName || !studentEmail) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createBooking.mutateAsync({
        coach_id: coachId,
        student_name: studentName,
        student_email: studentEmail,
        student_phone: studentPhone || null,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: notes || null,
        course_type: courseType || null,
      })
      
      toast.success('Booking request submitted! Check your email for confirmation.')
      
      // Reset form
      setSelectedDate(null)
      setSelectedSlot(null)
      setStudentName('')
      setStudentEmail('')
      setStudentPhone('')
      setCourseType('')
      setNotes('')
    } catch (error) {
      toast.error('Failed to submit booking. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Date Selection */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-black">1. Select a Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date)
                setSelectedSlot(null)
              }}
              disabled={disabledDays}
              className="rounded-md border"
            />
            <p className="text-sm text-gray-500 mt-4">
              Available days: {availableDaysOfWeek.map(d => DAYS_OF_WEEK[d]).join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-black">2. Select a Time</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-gray-500">Please select a date first.</p>
            ) : slotsForDate.length === 0 ? (
              <p className="text-gray-500">No availability for this day.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slotsForDate.map((slot) => {
                  const booked = isSlotBooked(slot, selectedDate)
                  return (
                    <Badge
                      key={slot.id}
                      variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                      className={`cursor-pointer py-2 px-3 text-sm ${
                        booked 
                          ? 'opacity-50 cursor-not-allowed bg-gray-200' 
                          : 'hover:bg-[#5E5044] hover:text-white border-[#5E5044] text-[#5E5044]'
                      } ${
                        selectedSlot?.id === slot.id 
                          ? 'bg-[#5E5044] text-white' 
                          : ''
                      }`}
                      onClick={() => !booked && setSelectedSlot(slot)}
                    >
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      {booked && ' (Booked)'}
                    </Badge>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Information */}
      {selectedSlot && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-black">3. Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {createBooking.isPending ? 'Submitting...' : 'Request Booking'}
            </Button>
            
            <p className="text-sm text-gray-500 text-center">
              After confirmation, you'll receive an email with payment instructions.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
