'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { usePointsCoaches } from '@/hooks/usePoints'
import { useUserPoints } from '@/hooks/usePoints'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Coins, 
  Crown, 
  Star, 
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react'

function CoachCard({ coach }) {
  const initials = coach.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  
  const isSpecial = coach.is_special
  const pointsCost = coach.points_cost || 1
  
  return (
    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-xl ${
      isSpecial ? 'border-2 border-purple-200' : ''
    }`}>
      {/* Photo */}
      <div className="relative h-48 bg-[#F5EFE7]">
        {coach.photo_url ? (
          <img
            src={coach.photo_url}
            alt={coach.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-[#5E5044]">{initials}</span>
          </div>
        )}
        
        {/* Points Badge */}
        <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
          <Coins className="w-4 h-4 text-[#5E5044]" />
          <span className="font-bold text-[#5E5044]">{pointsCost}</span>
          <span className="text-xs text-gray-500">pts/class</span>
        </div>
      </div>
      
      <CardContent className="p-5">
        {/* Special Badge */}
        {isSpecial && (
          <Badge className="mb-2 bg-purple-100 text-purple-800">
            <Crown className="w-3 h-3 mr-1" />
            {coach.rank_title || 'Elite Coach'}
          </Badge>
        )}
        
        {/* Name */}
        <h3 className="text-xl font-bold text-black mb-1">{coach.name}</h3>
        
        {/* Specialization */}
        {coach.specialization && (
          <p className="text-[#5E5044] text-sm mb-2">{coach.specialization}</p>
        )}
        
        {/* Achievements for special coaches */}
        {isSpecial && coach.achievements && coach.achievements.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {coach.achievements.slice(0, 2).map((achievement, i) => (
                <span key={i} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  {achievement}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Bio */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {coach.bio || 'Experienced chess coach ready to help you improve.'}
        </p>
        
        {/* CTA */}
        <Link href={`/book-with-points/book/${coach.id}`}>
          <Button className="w-full bg-[#5E5044] hover:bg-[#4a3f35]">
            Book with Points
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function BookWithPointsClient() {
  const { user } = useAuth()
  const { data: coaches, isLoading } = usePointsCoaches()
  const { data: points } = useUserPoints(user?.id)
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        {/* Header */}
        <div className="bg-[#5E5044] text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Book with Points
                </h1>
                <p className="text-gray-200">
                  Use your points to book flexible classes with any coach
                </p>
              </div>
              
              {user && (
                <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-300">Your Balance</p>
                    <p className="text-2xl font-bold">{points?.balance || 0} points</p>
                  </div>
                  <Link href="/buy-points">
                    <Button size="sm" className="bg-white text-[#5E5044] hover:bg-gray-100">
                      Buy More
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-3 h-3 bg-white border-2 border-gray-300 rounded"></div>
              <span>Regular Coach (1 point)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-3 h-3 bg-purple-100 border-2 border-purple-300 rounded"></div>
              <span>Elite Coach (2-3 points)</span>
            </div>
          </div>
          
          {/* Coaches Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#5E5044]" />
            </div>
          ) : coaches?.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-black mb-2">No Coaches Available</h3>
              <p className="text-gray-600">Please check back later.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} />
              ))}
            </div>
          )}
        </div>
        
        {/* How It Works */}
        <div className="bg-white py-12 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-black text-center mb-8">How Flexible Booking Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-bold text-black mb-2">Buy Points</h3>
                <p className="text-gray-600">Purchase points that are valid for one year. Any amount you want.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-bold text-black mb-2">Pick Your Schedule</h3>
                <p className="text-gray-600">Choose any available time slot from the coach&apos;s schedule. No recurring commitment.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#5E5044] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-bold text-black mb-2">Cancel Anytime</h3>
                <p className="text-gray-600">Cancel up to 24 hours before for a full point refund.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
