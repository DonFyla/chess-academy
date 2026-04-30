'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPoints } from '@/hooks/usePoints'
import { usePaystackPayment } from '@/hooks/usePaystack'
import { supabase } from '@/lib/supabase'
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
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// Pricing tiers - 10,000 Naira per point
const POINT_PACKAGES = [
  { points: 1, price: 10000, label: 'Single Class' },
  { points: 4, price: 38000, label: '4 Classes', savings: '5%' },
  { points: 8, price: 72000, label: '8 Classes', savings: '10%', popular: true },
  { points: 12, price: 102000, label: '12 Classes', savings: '15%' },
  { points: 20, price: 160000, label: '20 Classes', savings: '20%' },
]

const PRICE_PER_POINT = 10000 // Base price for custom amount

export default function BuyPointsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: points, isLoading: pointsLoading } = useUserPoints(user?.id)
  const { initializePayment, isLoading: isPaystackLoading } = usePaystackPayment()
  
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  
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
    const ref = `PTS-${Date.now().toString(36).toUpperCase()}`
    setSelectedPackage(pkg)
    
    // Create pending transaction
    try {
      const { error } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          type: 'purchase',
          amount: pkg.points,
          balance_after: 0,
          payment_reference: ref,
          description: `Purchase of ${pkg.points} points - ${pkg.label}`,
          status: 'pending',
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      
      if (error) throw error
      
      // Send pending email (don't block on email failure)
      try {
        await fetch('/api/points-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pointsPurchasePending',
            data: {
              student_name: user.user_metadata?.full_name || user.email,
              student_email: user.email,
              points_amount: pkg.points,
              total_amount: pkg.price,
              reference: ref,
            }
          })
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Continue anyway - payment will proceed
      }
      
      // Initialize Paystack payment
      await initializePayment({
        email: user.email,
        amount: pkg.price,
        reference: ref,
        metadata: {
          type: 'points_purchase',
          user_id: user.id,
          points: pkg.points,
        },
        onSuccess: (transaction) => {
          toast.success('Payment successful! Your points will be added shortly.')
          router.push('/dashboard')
        },
        onCancel: () => {
          toast.info('Payment was cancelled. You can retry from your dashboard.')
        },
      })
    } catch (error) {
      console.error('Error creating purchase:', error)
      toast.error(error?.message || 'Failed to create purchase. Please try again.')
    }
  }
  
  const handleBuyCustom = async () => {
    const amount = parseInt(customAmount)
    if (!amount || amount < 1) {
      toast.error('Please enter a valid amount')
      return
    }
    
    const price = amount * PRICE_PER_POINT
    const ref = `PTS-${Date.now().toString(36).toUpperCase()}`
    
    setSelectedPackage({ points: amount, price, label: 'Custom' })
    
    // Create pending transaction
    try {
      const { error } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          type: 'purchase',
          amount: amount,
          balance_after: 0,
          payment_reference: ref,
          description: `Purchase of ${amount} points - Custom`,
          status: 'pending',
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      
      if (error) throw error
      
      // Send pending email
      try {
        await fetch('/api/points-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pointsPurchasePending',
            data: {
              student_name: user.user_metadata?.full_name || user.email,
              student_email: user.email,
              points_amount: amount,
              total_amount: price,
              reference: ref,
            }
          })
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Continue anyway - payment will proceed
      }
      
      // Initialize Paystack payment
      await initializePayment({
        email: user.email,
        amount: price,
        reference: ref,
        metadata: {
          type: 'points_purchase',
          user_id: user.id,
          points: amount,
        },
        onSuccess: (transaction) => {
          toast.success('Payment successful! Your points will be added shortly.')
          router.push('/dashboard')
        },
        onCancel: () => {
          toast.info('Payment was cancelled. You can retry from your dashboard.')
        },
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Something went wrong. Please try again.')
    }
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
                  <li>• Elite coaches cost 2 points per class</li>
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
                className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                  pkg.popular ? 'border-2 border-[#5E5044] ring-2 ring-[#5E5044] ring-opacity-20' : ''
                }`}
                onClick={() => handleBuyPackage(pkg)}
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
                    className="w-full bg-[#5E5044] hover:bg-[#4a3f35]"
                    disabled={isPaystackLoading}
                  >
                    {isPaystackLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Select
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
                  disabled={!customAmount || isPaystackLoading}
                  className="bg-[#5E5044]"
                >
                  {isPaystackLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Select'
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
