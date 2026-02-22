'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCoaches } from '@/hooks/useCoaches'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Calendar, Clock, User, MapPin, Filter } from 'lucide-react'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(timeStr) {
  if (!timeStr) return '-'
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function AdminClassesPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [selectedCoach, setSelectedCoach] = useState('all')
  const [selectedWeek, setSelectedWeek] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const { data: coaches, isLoading: loadingCoaches } = useCoaches()

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

  // Fetch classes
  useEffect(() => {
    if (isAdmin) {
      fetchClasses()
    }
  }, [isAdmin, selectedCoach, selectedWeek])

  const fetchClasses = async () => {
    try {
      // Calculate week range
      const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 })
      const weekEnd = addDays(weekStart, 6)

      // Build query
      let query = supabase
        .from('bookings')
        .select(`
          *,
          coaches(name, email)
        `)
        .eq('status', 'confirmed')
        .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('booking_date')
        .order('start_time')

      // Filter by coach if selected
      if (selectedCoach && selectedCoach !== 'all') {
        query = query.eq('coach_id', selectedCoach)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to group by day
      const groupedByDay = daysOfWeek.map((dayName, index) => {
        const dayDate = addDays(weekStart, index)
        const dayClasses = (data || []).filter(booking => {
          const bookingDate = parseISO(booking.booking_date)
          return isSameDay(bookingDate, dayDate)
        })

        return {
          dayName,
          date: dayDate,
          classes: dayClasses
        }
      })

      setClasses(groupedByDay)
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#5E5044] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Calculate week range for display
  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 0 })
  const weekEnd = addDays(weekStart, 6)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-black">Weekly Classes Schedule</h1>
                <p className="text-gray-600">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </p>
              </div>
              <a 
                href="/admin/schedule" 
                className="px-4 py-2 bg-[#5E5044] text-white rounded-lg hover:bg-[#4a3f35] transition-colors text-center"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Filters */}
          <Card className="bg-white mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Filter className="h-4 w-4" />
                    Filter by Coach
                  </label>
                  <select
                    value={selectedCoach}
                    onChange={(e) => setSelectedCoach(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="all">All Coaches</option>
                    {coaches?.map(coach => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    Select Week
                  </label>
                  <input
                    type="date"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <div className="grid gap-4">
            {classes.map((day) => (
              <Card key={day.dayName} className="bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#F5EFE7] p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-[#5E5044]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-black">{day.dayName}</CardTitle>
                        <p className="text-sm text-gray-500">{format(day.date, 'MMMM d, yyyy')}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-[#F5EFE7] text-[#5E5044]">
                      {day.classes.length} class{day.classes.length !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {day.classes.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No classes scheduled</p>
                  ) : (
                    <div className="space-y-3">
                      {day.classes.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-[#F5EFE7] rounded-lg"
                        >
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <Clock className="h-4 w-4 text-[#5E5044]" />
                            <span className="font-medium text-[#5E5044]">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </span>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                <span className="font-medium">{booking.student_name}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {booking.coaches?.name || 'Unknown Coach'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {booking.student_email}
                              </span>
                            </div>
                          </div>
                          
                          {booking.course_type && (
                            <Badge variant="outline" className="text-xs">
                              {booking.course_type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
