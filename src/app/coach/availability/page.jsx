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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Clock, Calendar, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, getCurrentCoach } from '@/lib/supabase'

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function CoachAvailabilityPage() {
  const router = useRouter()
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const createAvailability = useCreateAvailability()
  const deleteAvailability = useDeleteAvailability()

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
            {/* Manage Availability */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  My Availability
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

            {/* Upcoming Bookings */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="animate-pulse h-32 bg-gray-200 rounded" />
                ) : upcomingBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming bookings.</p>
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
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
