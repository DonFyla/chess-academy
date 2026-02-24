'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPoints } from '@/hooks/usePoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Coins, 
  Check, 
  Crown,
  Calculator,
  ArrowRight,
  Info,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

// Pricing tiers (example - can be changed)
const POINT_PACKAGES = [
  { points: 1, price: 12000, label: 'Single Class' },
  { points: 4, price: 44000, label: '4 Classes', savings: '8%' },
  { points: 8, price: 84000, label: '8 Classes', savings: '12%', popular: true },
  { points: 12, price: 120000, label: '12 Classes', savings: '16%' },
  { points: 20, price: 190000, label: '20 Classes', savings: '20%' },
]

const PRICE_PER_POINT = 12000 // Base price for custom amount

export default function BuyPointsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: points, isLoading: pointsLoading } = useUserPoints(user?.id)
  
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  if (authLoading) {
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
  
  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-black mb-4">Please Sign In</h2>
              <p className="text-gray-600 mb-6">You need to be logged in to purchase points.</p>
              <Link href="/login">
                <Button className="bg-[#5E5044]">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
  }
  
  const handleBuyPackage = async (pkg) => {
    setIsProcessing(true)
    
    // Simulate payment processing
    // In production, this would redirect to Paystack/Flutterwave
    toast.success(`Redirecting to payment for ${pkg.points} points...`)
    
    // For now, just show a message
    setTimeout(() => {
      toast.info('Payment integration coming soon! Contact admin to add points manually.')
      setIsProcessing(false)
    }, 1500)
  }
  
  const handleBuyCustom = async () => {
    const amount = parseInt(customAmount)
    if (!amount || amount < 1) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setIsProcessing(true)
    const price = amount * PRICE_PER_POINT
    
    toast.success(`Redirecting to payment for ${amount} points (₦${price.toLocaleString()})...`)
    
    setTimeout(() => {
      toast.info('Payment integration coming soon! Contact admin to add points manually.')
      setIsProcessing(false)
    }, 1500)
  }
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">Buy Points</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Purchase points to book flexible classes with any coach.
              Points are valid for one year.
            </p>
          </div>
          
          {/* Current Balance */}
          <Card className="mb-8 bg-gradient-to-r from-[#5E5044] to-[#7a6b5c] text-white max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-gray-200 mb-2">Your Current Balance</p>
              <p className="text-5xl font-bold">
                {pointsLoading ? '...' : (points?.balance || 0)}
              </p>
              <p className="text-sm text-gray-300 mt-2">points</p>
            </CardContent>
          </Card>
          
          {/* Pricing Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">How Points Work:</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1">
                  <li>• 1 point = 1 class with a regular coach</li>
                  <li>• Elite coaches cost 2-3 points per class</li>
                  <li>• Book any available time slot</li>
                  <li>• Cancel up to 24 hours before for full refund</li>
                  <li>• Points valid for 1 year from purchase</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Package Options */}
          <h2 className="text-2xl font-bold text-black text-center mb-6">Choose a Package</h2>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12 max-w-6xl mx-auto">
            {POINT_PACKAGES.map((pkg) => (
              <Card 
                key={pkg.points} 
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  pkg.popular ? 'border-2 border-[#5E5044] ring-2 ring-[#5E5044] ring-opacity-20' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-[#5E5044] text-white text-center text-xs py-1">
                    Most Popular
                  </div>
                )}
                
                {pkg.savings && (
                  <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">
                    Save {pkg.savings}
                  </Badge>
                )}
                
                <CardContent className={`p-6 text-center ${pkg.popular ? 'pt-8' : ''}`}>
                  <div className="w-12 h-12 bg-[#F5EFE7] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coins className="w-6 h-6 text-[#5E5044]" />
                  </div>
                  
                  <h3 className="text-3xl font-bold text-black mb-1">{pkg.points}</h3>
                  <p className="text-gray-500 text-sm mb-4">points</p>
                  
                  <p className="text-2xl font-bold text-[#5E5044] mb-1">
                    ₦{pkg.price.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    ₦{Math.round(pkg.price / pkg.points).toLocaleString()}/point
                  </p>
                  
                  <Button 
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={isProcessing}
                    className="w-full bg-[#5E5044] hover:bg-[#4a3f35]"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Buy Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Custom Amount */}
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Custom Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Need a different amount? Buy any number of points at ₦{PRICE_PER_POINT.toLocaleString()} each.
              </p>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleBuyCustom}
                  disabled={isProcessing || !customAmount}
                  className="bg-[#5E5044]"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Buy'
                  )}
                </Button>
              </div>
              
              {customAmount && parseInt(customAmount) > 0 && (
                <p className="mt-4 text-center text-lg">
                  Total: <span className="font-bold text-[#5E5044]">
                    ₦{(parseInt(customAmount) * PRICE_PER_POINT).toLocaleString()}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Elite Coaches Note */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Want to learn from Nigeria&apos;s top-ranked coaches?
            </p>
            <Link href="/book-with-points">
              <Button variant="outline" className="border-[#5E5044] text-[#5E5044]">
                <Crown className="w-4 h-4 mr-2" />
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
