'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Loader2, ArrowLeft, Crown, Calendar, Plus, Minus, Clock, CheckCircle, CreditCard, AlertCircle, ChevronRight, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSpecialCoach } from '@/hooks/useSpecialCoaches'
import { useCreateSpecialBooking } from '@/hooks/useSpecialCoaches'
import { useCoachAvailability } from '@/hooks/useAvailability'
import { useAuth } from '@/contexts/AuthContext'
import { DAYS_OF_WEEK } from '@/lib/scheduling-types'

const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || 'https://wa.link/uj48gk'

const BANK_DETAILS = {
  bankName: 'Guarantee Trust Bank(GTB)',
  accountNumber: '0449558330',
  accountName: 'Moving Train Chess Academy Ltd',
}

// Session Scheduler Component
function SessionScheduler({ 
  availability, 
  totalSessions, 
  selectedSlots, 
  onSlotSelect,
  recurringMode,
  setRecurringMode,
  recurringDays,
  onRecurringDaysChange
}) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(0)
  
  // Generate weeks starting from next week
  const weeks = []
  const today = new Date()
  const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
  
  for (let i = 0; i < 8; i++) {
    const weekStart = addDays(nextWeekStart, i * 7)
    const weekDays = []
    for (let j = 0; j < 7; j++) {
      weekDays.push(addDays(weekStart, j))
    }
    weeks.push(weekDays)
  }
  
  const currentWeekDays = weeks[currentWeek]
  
  // Get available slots for a specific date
  const getSlotsForDate = (date) => {
    const dayOfWeek = date.getDay()
    return availability.filter(slot => slot.day_of_week === dayOfWeek)
  }
  
  const handleDateSelect = (date) => {
    setSelectedDate(date)
  }
  
  const handleSlotSelect = (slot) => {
    if (!selectedDate) return
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const newSlot = {
      date: dateStr,
      start_time: slot.start_time,
      end_time: slot.end_time,
      day_of_week: selectedDate.getDay()
    }
    
    // Check if already selected
    const exists = selectedSlots.find(s => 
      s.date === dateStr && s.start_time === slot.start_time
    )
    
    if (exists) {
      onSlotSelect(selectedSlots.filter(s => 
        !(s.date === dateStr && s.start_time === slot.start_time)
      ))
    } else if (selectedSlots.length < totalSessions) {
      onSlotSelect([...selectedSlots, newSlot])
    } else {
      toast.error(`You can only select ${totalSessions} sessions`)
    }
    
    setSelectedDate(null)
  }
  
  // Check if a slot is already selected
  const isSlotSelected = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => 
      s.date === dateStr && s.start_time === slot.start_time
    )
  }
  
  // Count selected slots for a date
  const getSelectedCountForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.filter(s => s.date === dateStr).length
  }
  
  // Auto-generate recurring slots when days are selected
  useEffect(() => {
    if (recurringMode && recurringDays.length > 0 && totalSessions > 0) {
      const newSlots = []
      let sessionsAdded = 0
      
      // Generate 8 weeks of recurring sessions
      for (let week = 0; week < 8 && sessionsAdded < totalSessions; week++) {
        const weekStart = addDays(nextWeekStart, week * 7)
        
        for (const dayIndex of recurringDays) {
          if (sessionsAdded >= totalSessions) break
          
          // Find the date for this day in the current week
          const targetDate = addDays(weekStart, dayIndex)
          const dateStr = format(targetDate, 'yyyy-MM-dd')
          
          // Get available slots for this day
          const daySlots = availability.filter(s => s.day_of_week === dayIndex)
          
          if (daySlots.length > 0) {
            // Use the first available slot
            const slot = daySlots[0]
            
            // Check if not already added
            const exists = newSlots.find(s => 
              s.date === dateStr && s.start_time === slot.start_time
            )
            
            if (!exists) {
              newSlots.push({
                date: dateStr,
                start_time: slot.start_time,
                end_time: slot.end_time,
                day_of_week: dayIndex
              })
              sessionsAdded++
            }
          }
        }
      }
      
      onSlotSelect(newSlots)
    }
  }, [recurringMode, recurringDays, totalSessions, availability])
  
  return (
    <div className="space-y-4">
      {/* Recurring Mode Toggle */}
      <div className="flex items-center gap-4 p-4 bg-[#F5EFE7] rounded-lg">
        <input
          type="checkbox"
          id="recurring"
          checked={recurringMode}
          onChange={(e) => {
            onRecurringDaysChange([])
            onSlotSelect([])
          }}
          className="w-5 h-5"
        />
        <label htmlFor="recurring" className="flex-1 cursor-pointer">
          <span className="font-semibold text-black">Recurring Sessions</span>
          <p className="text-sm text-gray-600">Same days every week</p>
        </label>
      </div>
      
      {/* Recurring Day Selector */}
      {recurringMode && (
        <div className="p-4 border rounded-lg">
          <Label className="text-black mb-3 block">Select days for recurring sessions:</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day, index) => (
              <button
                key={day}
                onClick={() => {
                  const newDays = recurringDays.includes(index)
                    ? recurringDays.filter(d => d !== index)
                    : [...recurringDays, index].sort()
                  onRecurringDaysChange(newDays)
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  recurringDays.includes(index)
                    ? 'bg-[#5E5044] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          {recurringDays.length > 0 && (
            <p className="text-sm text-gray-600 mt-3">
              Will book {Math.ceil(totalSessions / recurringDays.length)} weeks
            </p>
          )}
        </div>
      )}
      
      {/* Week Navigator */}
      {!recurringMode && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
            disabled={currentWeek === 0}
            className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50 text-black hover:bg-gray-200"
          >
            Previous Week
          </button>
          <span className="text-sm font-medium text-black">
            {format(currentWeekDays[0], 'MMM d')} - {format(currentWeekDays[6], 'MMM d, yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentWeek(Math.min(7, currentWeek + 1))}
            disabled={currentWeek === 7}
            className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50 text-black hover:bg-gray-200"
          >
            Next Week
          </button>
        </div>
      )}
      
      {/* Calendar Grid */}
      {!recurringMode && (
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day.slice(0, 3)}
            </div>
          ))}
          {currentWeekDays.map((date, idx) => {
            const slots = getSlotsForDate(date)
            const hasAvailability = slots.length > 0
            const isSelectedDate = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
            const selectedCount = getSelectedCountForDate(date)
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => hasAvailability && handleDateSelect(date)}
                disabled={!hasAvailability}
                className={`
                  p-2 min-h-[60px] rounded-lg border text-sm relative
                  ${!hasAvailability 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                    : isSelectedDate
                      ? 'bg-[#5E5044] text-white border-[#5E5044]'
                      : 'bg-white text-black border-gray-200 hover:border-[#5E5044]'
                  }
                `}
              >
                <div className="font-medium">{format(date, 'd')}</div>
                {hasAvailability && (
                  <div className="text-xs mt-1">
                    {slots.length} slot{slots.length > 1 ? 's' : ''}
                  </div>
                )}
                {selectedCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">
                    {selectedCount}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
      
      {/* Time Slots for Selected Date */}
      {selectedDate && !recurringMode && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-black mb-3">
            Available times for {format(selectedDate, 'EEEE, MMM d')}:
          </h4>
          <div className="flex flex-wrap gap-2">
            {getSlotsForDate(selectedDate).map((slot, idx) => {
              const isSelected = isSlotSelected(selectedDate, slot)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSlotSelect(slot)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Selected Sessions Summary */}
      {selectedSlots.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Selected Sessions:</h4>
          <div className="space-y-1">
            {selectedSlots.map((slot, idx) => (
              <div key={idx} className="text-sm text-green-700">
                {idx + 1}. {format(parseISO(slot.date), 'MMM d, yyyy')} at {slot.start_time.slice(0, 5)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Confirmation Page Component
function BookingConfirmation({ 
  coach, 
  formData, 
  selectedSlots, 
  totalSessions, 
  totalAmount, 
  recurringMode, 
  recurringDays,
  onConfirm,
  onBack,
  isSubmitting 
}) {
  const bookingRef = Math.random().toString(36).substring(2, 10).toUpperCase()
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="ml-2 text-sm font-medium text-green-600">Details</span>
          </div>
          <ChevronRight className="w-5 h-5 mx-4 text-gray-400" />
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-[#5E5044]">Confirmation</span>
          </div>
          <ChevronRight className="w-5 h-5 mx-4 text-gray-400" />
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#5E5044] text-xl font-bold">
              {coach.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-white">Review Your Booking</CardTitle>
              <p className="text-gray-200 text-sm">Special Coaching Session</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Coach Info */}
          <div className="flex justify-between items-start p-4 bg-[#F5EFE7] rounded-lg">
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
              <p className="font-semibold text-black">₦{coach.hourly_rate?.toLocaleString()}/session</p>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid md:grid-cols-3 gap-4">
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
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
            {recurringMode && (
              <p className="text-sm text-gray-500 mt-2">
                Recurring weekly on: {recurringDays.map(d => DAYS_OF_WEEK[d]).join(', ')}
              </p>
            )}
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

      {/* Payment Instructions */}
      <Card className="mb-6 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CreditCard className="w-5 h-5" />
            Payment Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Bank Transfer Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Bank Transfer Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Bank:</span>
                <span className="font-medium text-black">{BANK_DETAILS.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Number:</span>
                <span className="font-mono font-medium text-black bg-white px-2 py-1 rounded">{BANK_DETAILS.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Name:</span>
                <span className="font-medium text-black">{BANK_DETAILS.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-black">₦{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span className="font-mono font-medium text-black bg-white px-2 py-1 rounded">{bookingRef}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Confirmation */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Confirm Your Payment
            </h4>
            <ol className="text-sm text-orange-800 space-y-2 list-decimal list-inside">
              <li>Make the transfer using the bank details above</li>
              <li>Take a screenshot of the payment receipt</li>
              <li>Send the receipt via WhatsApp with your reference number</li>
              <li>We&apos;ll verify and confirm your booking within 24 hours</li>
            </ol>
            
            <a
              href={`${WHATSAPP_LINK}?text=Hello! I've made a payment for Special Coaching.%0A%0AReference: ${bookingRef}%0AAmount: ₦${totalAmount.toLocaleString()}%0ACoach: ${coach.name}%0ASessions: ${totalSessions}%0A%0AAttached is my payment receipt.`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Send Payment Receipt via WhatsApp
            </a>
          </div>

          {/* Time Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Your spot is held for 48 hours. Please complete payment within this time to secure your booking. 
              You will receive an email with these payment details.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Edit
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 bg-[#5E5044] hover:bg-[#4a3f35] py-6 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirm & Create Booking
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function SpecialBookingClient({ coachId }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: coach, isLoading: loadingCoach } = useSpecialCoach(coachId)
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(coachId)
  const createBooking = useCreateSpecialBooking()
  
  // Form state
  const [step, setStep] = useState('form') // 'form' or 'confirm'
  const [totalSessions, setTotalSessions] = useState(4)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [recurringMode, setRecurringMode] = useState(false)
  const [recurringDays, setRecurringDays] = useState([])
  
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
  })
  
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
  
  const totalAmount = (coach?.hourly_rate || 15000) * totalSessions
  
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
      const booking = {
        coach_id: coachId,
        student_name: formData.studentName,
        student_email: formData.studentEmail,
        student_phone: formData.studentPhone,
        total_sessions: totalSessions,
        session_dates: selectedSlots,
        is_recurring: recurringMode,
        recurring_days: recurringDays,
        hourly_rate: coach?.hourly_rate || 15000,
        total_amount: totalAmount,
        status: 'pending_payment',
      }
      
      await createBooking.mutateAsync(booking)
      
      toast.success('Booking created successfully! Check your email for payment details.')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to create booking: ' + error.message)
    }
  }
  
  if (loadingCoach || authLoading) {
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
  
  // Confirmation Step
  if (step === 'confirm') {
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
            <BookingConfirmation
              coach={coach}
              formData={formData}
              selectedSlots={selectedSlots}
              totalSessions={totalSessions}
              totalAmount={totalAmount}
              recurringMode={recurringMode}
              recurringDays={recurringDays}
              onConfirm={handleConfirmBooking}
              onBack={() => setStep('form')}
              isSubmitting={createBooking.isPending}
            />
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
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-[#5E5044]">Details</span>
              </div>
              <ChevronRight className="w-5 h-5 mx-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Confirmation</span>
              </div>
              <ChevronRight className="w-5 h-5 mx-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
              </div>
            </div>
          </div>

          {/* Coach Summary */}
          <Card className="mb-8 bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#5E5044] text-2xl font-bold">
                  {coach.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold">{coach.rank_title || 'Elite Coach'}</span>
                  </div>
                  <h1 className="text-2xl font-bold">{coach.name}</h1>
                  <p className="text-gray-200">{coach.specialization}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">₦{coach.hourly_rate?.toLocaleString() || '15,000'}</div>
                  <div className="text-sm text-gray-200">per session</div>
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
                
                {/* Step 2: Schedule Sessions */}
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
                      <SessionScheduler
                        availability={availability}
                        totalSessions={totalSessions}
                        selectedSlots={selectedSlots}
                        onSlotSelect={setSelectedSlots}
                        recurringMode={recurringMode}
                        setRecurringMode={setRecurringMode}
                        recurringDays={recurringDays}
                        onRecurringDaysChange={setRecurringDays}
                      />
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
                      <span className="font-medium text-black">₦{(coach?.hourly_rate || 15000).toLocaleString()}</span>
                    </div>
                    
                    {selectedSlots.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-gray-600 mb-2">Schedule:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedSlots.map((slot, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              {idx + 1}. {format(parseISO(slot.date), 'MMM d')} at {slot.start_time.slice(0, 5)}
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
                      className="w-full bg-[#5E5044] hover:bg-[#4a3f35] py-6 text-lg"
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
