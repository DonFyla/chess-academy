'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CoachCard from '@/components/scheduling/CoachCard'
import { useCoaches } from '@/hooks/useCoaches'
import { Users } from 'lucide-react'

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
