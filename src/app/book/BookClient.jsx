'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CoachCard from '@/components/scheduling/CoachCard'
import { useCoaches } from '@/hooks/useCoaches'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Crown, Star, ArrowRight } from 'lucide-react'

export default function BookClient() {
  const { data: coaches, isLoading, error } = useCoaches()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-[#5E5044]" />
              <h1 className="text-xl font-bold text-black">Book a Coach</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Special Coaches Banner */}
          <Card className="mb-8 bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Elite Coaching</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Learn from Nigeria&apos;s #1 Chess Masters
                  </h2>
                  <p className="text-gray-200">
                    Book one-on-one sessions with FIDE Masters and National Champions.
                    Personalized training for serious players.
                  </p>
                </div>
                <Link href="/special-coaches">
                  <Button className="bg-white text-[#5E5044] hover:bg-gray-100 whitespace-nowrap">
                    <Star className="w-4 h-4 mr-2" />
                    View Elite Coaches
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-black">Find Your Coach</h2>
            <p className="text-gray-600">
              Browse our expert coaches and book a session at your convenience.
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500">Error loading coaches. Please try again.</p>
          ) : coaches?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-black">No coaches available</h3>
              <p className="text-gray-500">
                Please check back later.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coaches?.map((coach) => (
                <CoachCard key={coach.id} coach={coach} />
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  )
}
