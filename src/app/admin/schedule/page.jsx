'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCoaches, useCreateCoach, useDeleteCoach } from '@/hooks/useCoaches'
import { useCoachAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useAvailability'
import { useAllBookings, useUpdateBookingStatus } from '@/hooks/useBookings'
import AddAvailabilityForm from '@/components/scheduling/AddAvailabilityForm'
import AvailabilityList from '@/components/scheduling/AvailabilityList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Plus, Trash2, CheckCircle, XCircle, Calendar, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function AdminSchedulePage() {
  const router = useRouter()
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [newCoach, setNewCoach] = useState({ name: '', bio: '', specialization: '' })

  const { data: coaches, isLoading: loadingCoaches } = useCoaches()
  const { data: allBookings, isLoading: loadingBookings } = useAllBookings()
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(selectedCoach?.id)

  const createCoach = useCreateCoach()
  const deleteCoach = useDeleteCoach()
  const createAvailability = useCreateAvailability()
  const deleteAvailability = useDeleteAvailability()
  const updateBooking = useUpdateBookingStatus()

  // Check if user is admin (simplified - in production, check auth)
  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return false
    }
    // Additional admin check would go here
    return true
  }

  const handleAddCoach = async (e) => {
    e.preventDefault()
    try {
      await createCoach.mutateAsync(newCoach)
      toast.success('Coach added successfully')
      setNewCoach({ name: '', bio: '', specialization: '' })
      setShowAddCoach(false)
    } catch (error) {
      toast.error('Failed to add coach')
    }
  }

  const handleDeleteCoach = async (id) => {
    if (!confirm('Are you sure you want to delete this coach?')) return
    try {
      await deleteCoach.mutateAsync(id)
      toast.success('Coach deleted')
    } catch (error) {
      toast.error('Failed to delete coach')
    }
  }

  const handleAddAvailability = async (slot) => {
    if (!selectedCoach) {
      toast.error('Please select a coach first')
      return
    }
    try {
      console.log('Adding availability:', { ...slot, coach_id: selectedCoach.id })
      await createAvailability.mutateAsync({ 
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        coach_id: selectedCoach.id 
      })
      toast.success('Availability added successfully')
    } catch (error) {
      console.error('Error adding availability:', error)
      toast.error(`Failed to add availability: ${error.message}`)
    }
  }

  const handleDeleteAvailability = async (id) => {
    try {
      await deleteAvailability.mutateAsync({ id, coachId: selectedCoach.id })
      toast.success('Availability removed')
    } catch (error) {
      toast.error('Failed to remove availability')
    }
  }

  const handleUpdateBookingStatus = async (id, status) => {
    try {
      await updateBooking.mutateAsync({ id, status })
      toast.success(`Booking ${status}`)
    } catch (error) {
      toast.error('Failed to update booking')
    }
  }

  const pendingBookings = allBookings?.filter(b => b.status === 'pending') || []
  const confirmedBookings = allBookings?.filter(b => b.status === 'confirmed') || []

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-black">Admin Schedule Dashboard</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="bg-white">
              <TabsTrigger value="bookings" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Calendar className="mr-2 h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="coaches" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Users className="mr-2 h-4 w-4" />
                Coaches
              </TabsTrigger>
              <TabsTrigger value="availability" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Clock className="mr-2 h-4 w-4" />
                Availability
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="grid gap-6">
                {/* Pending Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      Pending Bookings
                      <Badge variant="secondary">{pendingBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : pendingBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending bookings.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                              </TableCell>
                              <TableCell>{booking.coaches?.name}</TableCell>
                              <TableCell>
                                <div>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</div>
                                <div className="text-sm text-gray-500">
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{booking.course_type || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'rejected')}
                                  >
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Confirmed Bookings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      Confirmed Bookings
                      <Badge variant="default" className="bg-green-600">{confirmedBookings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingBookings ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded" />
                    ) : confirmedBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No confirmed bookings.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Course</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {confirmedBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="font-medium text-black">{booking.student_name}</div>
                                <div className="text-sm text-gray-500">{booking.student_email}</div>
                              </TableCell>
                              <TableCell>{booking.coaches?.name}</TableCell>
                              <TableCell>
                                <div>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</div>
                                <div className="text-sm text-gray-500">
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{booking.course_type || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Coaches Tab */}
            <TabsContent value="coaches">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-black">Manage Coaches</CardTitle>
                  <Button 
                    onClick={() => setShowAddCoach(true)}
                    className="bg-[#5E5044] hover:bg-[#4a3f35]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Coach
                  </Button>
                </CardHeader>
                <CardContent>
                  {showAddCoach && (
                    <form onSubmit={handleAddCoach} className="mb-6 p-4 bg-[#F5EFE7] rounded-lg space-y-4">
                      <div>
                        <Label className="text-black">Name</Label>
                        <Input
                          value={newCoach.name}
                          onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                          placeholder="Coach name"
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Specialization</Label>
                        <Input
                          value={newCoach.specialization}
                          onChange={(e) => setNewCoach({ ...newCoach, specialization: e.target.value })}
                          placeholder="e.g., Beginner Training"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Bio</Label>
                        <Textarea
                          value={newCoach.bio}
                          onChange={(e) => setNewCoach({ ...newCoach, bio: e.target.value })}
                          placeholder="Coach bio..."
                          className="bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-[#5E5044]">Add Coach</Button>
                        <Button type="button" variant="outline" onClick={() => setShowAddCoach(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {loadingCoaches ? (
                    <div className="animate-pulse h-32 bg-gray-200 rounded" />
                  ) : (
                    <div className="space-y-2">
                      {coaches?.map((coach) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <h3 className="font-medium text-black">{coach.name}</h3>
                            <p className="text-sm text-gray-500">{coach.specialization}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCoach(coach.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-black">Select Coach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {coaches?.map((coach) => (
                        <Button
                          key={coach.id}
                          variant={selectedCoach?.id === coach.id ? 'default' : 'outline'}
                          className={`w-full justify-start ${
                            selectedCoach?.id === coach.id 
                              ? 'bg-[#5E5044] text-white' 
                              : 'text-black'
                          }`}
                          onClick={() => setSelectedCoach(coach)}
                        >
                          {coach.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {selectedCoach && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-black">
                        Manage {selectedCoach.name}&apos;s Availability
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Footer />
    </>
  )
}
