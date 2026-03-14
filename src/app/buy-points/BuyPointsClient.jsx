'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPoints } from '@/hooks/usePoints'
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
  Banknote,
  MessageCircle
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
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || 'https://wa.link/uj48gk'

const BANK_DETAILS = {
  bankName: 'GT Bank',
  accountNumber: '0878016456',
  accountName: 'The Moving Train Educational Services Ltd',
}

export default function BuyPointsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: points, isLoading: pointsLoading } = useUserPoints(user?.id)
  
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  
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
    setPaymentReference(ref)
    
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
        // Continue anyway - payment info is shown on screen
      }
      
      setShowPaymentInfo(true)
      toast.success('Payment instructions sent to your email!')
    } catch (error) {
      console.error('Error creating purchase:', error)
      toast.error(error?.message || 'Failed to create purchase. Please try again.')
    }
    
    // Scroll to payment info
    setTimeout(() => {
      document.getElementById('payment-info')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
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
    setPaymentReference(ref)
    
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
      
      setShowPaymentInfo(true)
      toast.success('Payment instructions sent to your email!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Something went wrong. Please try again.')
    }
    
    setTimeout(() => {
      document.getElementById('payment-info')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
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
          
          {!showPaymentInfo ? (
            <>
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
                      >
                        Select
                        <ArrowRight className="w-4 h-4 ml-2" />
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
                      disabled={!customAmount}
                      className="bg-[#5E5044]"
                    >
                      Select
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
            </>
          ) : (
            /* Payment Instructions */
            <div id="payment-info" className="max-w-2xl mx-auto">
              <Card className="border-2 border-[#5E5044]">
                <CardHeader className="bg-[#5E5044] text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    Complete Your Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Points Reserved!</span>
                    </div>
                    <p className="text-green-700 text-sm">
                      We've sent an email to {user.email} with your payment details.
                    </p>
                  </div>
                  
                  <div className="bg-[#F5EFE7] rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-[#5E5044] mb-4">Purchase Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points</span>
                        <span className="font-bold text-black">{selectedPackage?.points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount</span>
                        <span className="font-bold text-black">₦{selectedPackage?.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Reference</span>
                        <span className="font-mono font-bold text-[#5E5044]">{paymentReference}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-green-500 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                      <Banknote className="w-5 h-5" />
                      Bank Transfer Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bank</span>
                        <span className="font-semibold text-black">{BANK_DETAILS.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Number</span>
                        <span className="font-mono font-bold text-black text-lg">{BANK_DETAILS.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Name</span>
                        <span className="font-semibold text-black">{BANK_DETAILS.accountName}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Amount to Pay</span>
                        <span className="font-bold text-2xl text-[#5E5044]">₦{selectedPackage?.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference</span>
                        <span className="font-mono font-bold text-[#5E5044]">{paymentReference}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Confirm Your Payment
                    </h3>
                    <ol className="text-orange-700 text-sm space-y-2 mb-4">
                      <li>1. Make the bank transfer using the details above</li>
                      <li>2. Take a screenshot of the payment receipt</li>
                      <li>3. Send the receipt via WhatsApp</li>
                      <li>4. We'll verify and add points within 24 hours</li>
                    </ol>
                    
                    <a 
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Send Payment Receipt via WhatsApp
                    </a>
                    
                    <p className="text-xs text-orange-600 mt-3 text-center">
                      <strong>Important:</strong> Include reference <strong>{paymentReference}</strong> in your message
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowPaymentInfo(false)}
                    >
                      Back to Packages
                    </Button>
                    <Link href="/dashboard" className="flex-1">
                      <Button className="w-full bg-[#5E5044]">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Elite Coaches Note */}
          {!showPaymentInfo && (
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
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
