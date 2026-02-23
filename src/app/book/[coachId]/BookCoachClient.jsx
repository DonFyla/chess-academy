'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BookingForm from '@/components/scheduling/BookingForm'
import { useCoach } from '@/hooks/useCoaches'
import { useCoachAvailability } from '@/hooks/useAvailability'
import { useCoachBookings } from '@/hooks/useBookings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Clock } from 'lucide-react'

export default function BookCoachClient({ coachId }) {
  const { data: coach, isLoading: loadingCoach } = useCoach(coachId)
  const { data: availability = [], isLoading: loadingAvailability } = useCoachAvailability(coachId)
  const { data: bookings = [] } = useCoachBookings(coachId)

  if (loadingCoach) {
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
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-black">Coach not found</h2>
            <Button asChild className="bg-[#5E5044]">
              <Link href="/book">Go Back</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const initials = coach.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" asChild className="text-[#5E5044]">
              <Link href="/book">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Coaches
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Coach Profile */}
          <Card className="mb-8 bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="h-24 w-24 rounded-full bg-[#F5EFE7] flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#5E5044]">{initials}</span>
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2 text-black">{coach.name}</h1>
                  {coach.specialization && (
                    <span className="inline-block bg-[#F5EFE7] text-[#5E5044] px-3 py-1 rounded-full text-sm mb-3">
                      {coach.specialization}
                    </span>
                  )}
                  {coach.bio && (
                    <p className="text-gray-600">{coach.bio}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <h2 className="text-2xl font-bold mb-6 text-black">Book a Session</h2>
          {loadingAvailability ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded-lg" />
          ) : availability.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-black">No availability set</h3>
                <p className="text-gray-500">
                  This coach hasn&apos;t set their availability yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <BookingForm
              coachId={coach.id}
              availability={availability}
              existingBookings={bookings}
              coachName={coach.name}
            />
          )}
        </main>
      </div>
      <Footer />
    </>
  )
}
