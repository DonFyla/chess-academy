import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
const resendKey = process.env.RESEND_API_KEY

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

/**
 * Verify Paystack webhook signature using HMAC-SHA512
 */
function verifyPaystackSignature(body, signature) {
  if (!paystackSecretKey) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return false
  }

  const hash = crypto
    .createHmac('sha512', paystackSecretKey)
    .update(body, 'utf8')
    .digest('hex')

  return hash === signature
}

/**
 * Send email via Resend
 */
async function sendEmail({ to, subject, html }) {
  if (!resendKey || !to) return { success: false, error: 'Missing config' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Moving Train Chess Academy <bookings@themovingtrain.org>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data: await res.json() }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle points purchase confirmation
 */
async function handlePointsPurchase(reference, metadata) {
  console.log('[Paystack Webhook] Processing points purchase:', reference)

  // 1. Find the pending transaction
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('point_transactions')
    .select('*')
    .eq('payment_reference', reference)
    .eq('status', 'pending')
    .single()

  if (txError || !transaction) {
    console.error('[Paystack Webhook] Transaction not found:', reference, txError?.message)
    return { success: false, error: 'Transaction not found' }
  }

  // 2. Check if already processed (idempotency)
  if (transaction.status !== 'pending') {
    console.log('[Paystack Webhook] Transaction already processed:', reference)
    return { success: true, message: 'Already processed' }
  }

  // 3. Update transaction status
  const { error: updateError } = await supabaseAdmin
    .from('point_transactions')
    .update({ status: 'completed' })
    .eq('id', transaction.id)

  if (updateError) {
    console.error('[Paystack Webhook] Failed to update transaction:', updateError)
    return { success: false, error: 'Failed to update transaction' }
  }

  // 4. Add points to user_points
  const { data: existingPoints } = await supabaseAdmin
    .from('user_points')
    .select('*')
    .eq('user_id', transaction.user_id)
    .single()

  const newBalance = (existingPoints?.balance || 0) + transaction.amount
  const newTotalPurchased = (existingPoints?.total_purchased || 0) + transaction.amount
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error: upsertError } = await supabaseAdmin
    .from('user_points')
    .upsert({
      user_id: transaction.user_id,
      balance: newBalance,
      total_purchased: newTotalPurchased,
      total_used: existingPoints?.total_used || 0,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (upsertError) {
    console.error('[Paystack Webhook] Failed to update user points:', upsertError)
    return { success: false, error: 'Failed to update user points' }
  }

  // 5. Send confirmation email
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(transaction.user_id)
  const userEmail = userData?.user?.email

  if (userEmail) {
    await sendEmail({
      to: userEmail,
      subject: 'Points Added to Your Account! ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
          </div>
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4CAF50;">
            <h2 style="color: #2E7D32; margin: 0;">✅ Payment Confirmed!</h2>
            <p style="margin: 10px 0 0 0; color: #2E7D32;">Points have been added to your account</p>
          </div>
          <p>Hello,</p>
          <p>We've received your payment and <strong>${transaction.amount} points</strong> have been added to your account!</p>
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #5E5044;">Your New Balance</h3>
            <p style="font-size: 48px; font-weight: bold; color: #5E5044; margin: 10px 0;">${newBalance}</p>
            <p style="color: #666;">points</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/book-with-points" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Book a Class Now
            </a>
          </div>
        </div>
      `,
    })
  }

  console.log('[Paystack Webhook] Points purchase completed:', reference, 'New balance:', newBalance)
  return { success: true, newBalance }
}

/**
 * Handle booking payment confirmation
 */
async function handleBooking(reference, metadata) {
  console.log('[Paystack Webhook] Processing booking payment:', reference)

  const table = metadata?.table || 'bookings'
  const bookingId = metadata?.booking_id

  if (!bookingId) {
    console.error('[Paystack Webhook] No booking_id in metadata')
    return { success: false, error: 'No booking_id in metadata' }
  }

  // 1. Find the pending booking
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('id', bookingId)
    .eq('status', 'pending_payment')
    .single()

  if (bookingError || !booking) {
    console.error('[Paystack Webhook] Booking not found:', bookingId, bookingError?.message)
    return { success: false, error: 'Booking not found' }
  }

  // 2. Update booking status
  const updateData = {
    status: 'confirmed',
    payment_status: 'paid',
    payment_date: new Date().toISOString(),
    payment_reference: reference,
  }

  const { error: updateError } = await supabaseAdmin
    .from(table)
    .update(updateData)
    .eq('id', bookingId)

  if (updateError) {
    console.error('[Paystack Webhook] Failed to update booking:', updateError)
    return { success: false, error: 'Failed to update booking' }
  }

  // 3. Send confirmation email to student
  const studentEmail = booking.student_email
  if (studentEmail) {
    await sendEmail({
      to: studentEmail,
      subject: 'Booking Confirmed! 🎓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
          </div>
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4CAF50;">
            <h2 style="color: #2E7D32; margin: 0;">✅ Booking Confirmed!</h2>
          </div>
          <p>Hello ${booking.student_name},</p>
          <p>Your booking has been confirmed and payment received.</p>
          <p>Reference: <strong>${reference}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/dashboard" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              View Your Dashboard
            </a>
          </div>
        </div>
      `,
    })
  }

  console.log('[Paystack Webhook] Booking payment completed:', reference)
  return { success: true }
}

/**
 * POST handler for Paystack webhooks
 */
export async function POST(request) {
  try {
    // 1. Get raw body and signature
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      console.error('[Paystack Webhook] Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // 2. Verify signature
    if (!verifyPaystackSignature(rawBody, signature)) {
      console.error('[Paystack Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 3. Parse event
    const event = JSON.parse(rawBody)
    console.log('[Paystack Webhook] Event received:', event.event)

    // 4. Only handle charge.success events
    if (event.event !== 'charge.success') {
      console.log('[Paystack Webhook] Ignoring event:', event.event)
      return NextResponse.json({ success: true, message: 'Event ignored' })
    }

    const { data } = event
    const reference = data.reference
    const metadata = data.metadata || {}
    const type = metadata.type

    console.log('[Paystack Webhook] Processing charge.success:', { reference, type })

    // 5. Route to appropriate handler
    let result
    switch (type) {
      case 'points_purchase':
        result = await handlePointsPurchase(reference, metadata)
        break
      case 'booking':
        result = await handleBooking(reference, metadata)
        break
      case 'special_booking':
        result = await handleBooking(reference, { ...metadata, table: 'special_bookings' })
        break
      default:
        console.error('[Paystack Webhook] Unknown payment type:', type)
        return NextResponse.json({ error: 'Unknown payment type' }, { status: 400 })
    }

    if (!result.success) {
      console.error('[Paystack Webhook] Processing failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Paystack Webhook] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
