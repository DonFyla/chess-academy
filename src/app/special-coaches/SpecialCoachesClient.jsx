'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useSpecialCoaches } from '@/hooks/useSpecialCoaches'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Star, Trophy, ArrowRight, Loader2 } from 'lucide-react'

function SpecialCoachCard({ coach, index }) {
  const initials = coach.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  
  const isTopThree = index < 3
  
  return (
    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-xl ${
      isTopThree ? 'border-2 border-[#5E5044]' : ''
    }`}>
      {/* Photo */}
      <div className="relative h-64 bg-[#F5EFE7]">
        {coach.photo_url ? (
          <img
            src={coach.photo_url}
            alt={coach.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-bold text-[#5E5044]">{initials}</span>
          </div>
        )}
        
        {/* Hourly Rate Badge */}
        <div className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg">
          <span className="text-lg font-bold text-[#5E5044]">
            ₦{coach.hourly_rate?.toLocaleString() || '15,000'}
          </span>
          <span className="text-sm text-gray-500">/session</span>
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* Name */}
        <h2 className="text-2xl font-bold text-black mb-2">{coach.name}</h2>
        
        {/* Specialization */}
        {coach.specialization && (
          <p className="text-[#5E5044] font-medium mb-3">{coach.specialization}</p>
        )}
        
        {/* Achievements */}
        {coach.achievements && coach.achievements.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Achievements:</h4>
            <ul className="space-y-1">
              {coach.achievements.slice(0, 3).map((achievement, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" />
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Bio */}
        <p className="text-gray-600 text-sm mb-6 line-clamp-3">
          {coach.special_bio || coach.bio || 'Elite chess coach with years of experience training champions.'}
        </p>
        
        {/* CTA */}
        <Link href={`/special-coaches/book/${coach.id}`}>
          <Button className="w-full bg-[#5E5044] hover:bg-[#4a3f35] text-lg py-6">
            Book Sessions
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function SpecialCoachesClient() {
  const { data: coaches, isLoading, error } = useSpecialCoaches()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        {/* Hero Section */}
        <div className="bg-[#5E5044] text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <Crown className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Elite Chess Coaches
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Personalized sessions with West Africa&apos;s best players. 
              For executives, CEOs, VIPs and gifted children aiming to play chess professionally.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge className="bg-white text-[#5E5044] text-lg px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                Premium 1-on-1 Coaching
              </Badge>
              <Badge className="bg-white text-[#5E5044] text-lg px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                Executive-Focused Training
              </Badge>
              <Badge className="bg-white text-[#5E5044] text-lg px-4 py-2">
                <Trophy className="w-4 h-4 mr-2" />
                Pro Career Track
              </Badge>
            </div>
          </div>
        </div>

        {/* Coaches Grid */}
        <div className="container mx-auto px-4 py-12">
          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black text-center mb-8">
              How Special Coaching Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-bold text-black mb-2">Choose Your Coach</h3>
                <p className="text-gray-600">Browse our elite coaches and pick the one that fits your goals.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-bold text-black mb-2">Book Sessions</h3>
                <p className="text-gray-600">Select how many sessions and choose dates from their availability.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-bold text-black mb-2">Start Learning</h3>
                <p className="text-gray-600">Get personalized training and take your chess to the next level.</p>
              </div>
            </div>
          </div>

          {/* Coaches List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#5E5044]" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500">Error loading coaches. Please try again.</p>
            </div>
          ) : coaches?.length === 0 ? (
            <div className="text-center py-20">
              <Crown className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-black mb-2">No Special Coaches Available</h3>
              <p className="text-gray-600">Check back soon for our elite coaching lineup.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coaches.map((coach, index) => (
                <SpecialCoachCard key={coach.id} coach={coach} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Regular Coaches CTA */}
        <div className="bg-white py-12 border-t">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-black mb-4">
              Looking for More Affordable Options?
            </h2>
            <p className="text-gray-600 mb-6">
              We also have excellent certified coaches at more affordable rates.
            </p>
            <Link href="/book">
              <Button variant="outline" className="border-[#5E5044] text-[#5E5044]">
                View All Coaches
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
