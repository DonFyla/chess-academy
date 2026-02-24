'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useSpecialCoach } from '@/hooks/useSpecialCoaches'
import { useCoachAvailability } from '@/hooks/useAvailability'
import { useCreateSpecialBooking } from '@/hooks/useSpecialCoaches'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Crown, Calendar, Clock, Minus, Plus, Check, Loader2 } from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { toast } from 'sonner'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function SessionScheduler({ 
  availability, 
  totalSessions, 
  selectedSlots, 
  onSlotSelect,
  recurringMode,
  recurringDays,
  onRecurringDaysChange
}) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  
  // Generate next 8 weeks
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(currentWeek, i * 7))
  
  // Get available slots for a specific day
  const getSlotsForDay = (date) => {
    const dayOfWeek = date.getDay()
    return availability.filter(slot => slot.day_of_week === dayOfWeek)
  }
  
  const isSlotSelected = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedSlots.some(s => s.date === dateStr && s.start_time === slot.start_time)
  }
  
  const toggleSlot = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const slotKey = `${dateStr}_${slot.start_time}`
    
    if (isSlotSelected(date, slot)) {
      onSlotSelect(selectedSlots.filter(s => !(s.date === dateStr && s.start_time === slot.start_time)))
    } else {
      if (selectedSlots.length >= totalSessions) {
        toast.error(`You can only select ${totalSessions} sessions`)
        return
      }
      onSlotSelect([...selectedSlots, {
        date: dateStr,
        start_time: slot.start_time,
        end_time: slot.end_time,
        day_of_week: date.getDay()
      }])
    }
  }
  
  // Auto-select recurring slots
  useEffect(() => {
    if (recurringMode && recurringDays.length > 0) {
      const newSlots = []
      let sessionsAdded = 0
      
      // For each week
      for (const weekStart of weeks) {
        if (sessionsAdded >= totalSessions) break
        
        // For each recurring day
        for (const dayIndex of recurringDays) {
          if (sessionsAdded >= totalSessions) break
          
          const date = addDays(weekStart, dayIndex)
          const dateStr = format(date, 'yyyy-MM-dd')
          const daySlots = getSlotsForDay(date)
          
          // Pick first available slot of the day
          if (daySlots.length > 0) {
            const slot = daySlots[0]
            // Check if not already selected
            if (!newSlots.some(s => s.date === dateStr && s.start_time === slot.start_time)) {
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
      
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Selected: {selectedSlots.length} / {totalSessions} sessions
        </span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#5E5044] transition-all"
            style={{ width: `${(selectedSlots.length / totalSessions) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Calendar Grid */}
      {!recurringMode && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {weeks.map((weekStart) => (
            <div key={weekStart.toISOString()} className="border rounded-lg p-4">
              <h4 className="font-semibold text-black mb-3">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </h4>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(weekStart, i)
                  const slots = getSlotsForDay(date)
                  const isToday = isSameDay(date, new Date())
                  
                  return (
                    <div key={i} className={`min-h-[80px] p-2 rounded-lg border ${
                      isToday ? 'bg-[#F5EFE7] border-[#5E5044]' : 'bg-gray-50'
                    }`}>
                      <div className="text-xs text-gray-500 mb-1">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-sm font-semibold text-black mb-2">
                        {format(date, 'd')}
                      </div>
                      
                      {slots.length > 0 ? (
                        <div className="space-y-1">
                          {slots.map((slot, idx) => {
                            const selected = isSlotSelected(date, slot)
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleSlot(date, slot)}
                                className={`w-full text-xs py-1 px-2 rounded transition-colors ${
                                  selected
                                    ? 'bg-[#5E5044] text-white'
                                    : 'bg-white hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                {selected ? <Check className="w-3 h-3 inline" /> : null}
                                {slot.start_time.slice(0, 5)}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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

export default function SpecialBookingClient({ coachId }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: coach, isLoading: loadingCoach } = useSpecialCoach(coachId)
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(coachId)
  const createBooking = useCreateSpecialBooking()
  
  // Form state
  const [step, setStep] = useState(1)
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
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (selectedSlots.length !== totalSessions) {
      toast.error(`Please select exactly ${totalSessions} sessions`)
      return
    }
    
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
      
      toast.success('Booking created! Proceed to payment.')
      router.push('/payment/special-booking')
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
          
          <form onSubmit={handleSubmit}>
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
                      disabled={
                        createBooking.isPending ||
                        selectedSlots.length !== totalSessions ||
                        !formData.studentName ||
                        !formData.studentEmail ||
                        !formData.studentPhone
                      }
                      className="w-full bg-[#5E5044] hover:bg-[#4a3f35] py-6 text-lg"
                    >
                      {createBooking.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Proceed to Payment'
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      You will receive an email with payment instructions
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
