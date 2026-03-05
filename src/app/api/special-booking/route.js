import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create admin client with service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  try {
    const booking = await request.json()
    
    // Validate required fields
    if (!booking.coach_id || !booking.student_name || !booking.student_email || !booking.student_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (!booking.session_dates || booking.session_dates.length === 0) {
      return NextResponse.json(
        { error: 'No sessions selected' },
        { status: 400 }
      )
    }
    
    // Insert booking using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('special_bookings')
      .insert({
        coach_id: booking.coach_id,
        student_name: booking.student_name,
        student_email: booking.student_email,
        student_phone: booking.student_phone,
        total_sessions: booking.total_sessions,
        session_dates: booking.session_dates,
        is_recurring: booking.is_recurring || false,
        recurring_days: booking.recurring_days || [],
        hourly_rate: booking.hourly_rate,
        total_amount: booking.total_amount,
        status: 'pending_payment'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    // Send confirmation email to student
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-special-booking-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: data,
          type: 'studentBookingReceived',
          recipient: data.student_email
        })
      })
    } catch (emailError) {
      console.error('Failed to send student email:', emailError)
      // Don't fail the booking if email fails
    }
    
    // Try to send email to coach
    try {
      // Get coach details
      const { data: coach } = await supabaseAdmin
        .from('coaches')
        .select('name, email, user_id')
        .eq('id', data.coach_id)
        .single()
      
      let coachEmail = coach?.email
      
      // If no email in coaches table, try to get from auth
      if (!coachEmail && coach?.user_id) {
        const { data: userData } = await supabaseAdmin
          .rpc('get_user_email', { user_id: coach.user_id })
        
        if (userData) coachEmail = userData
      }
      
      if (coachEmail) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-special-booking-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking: { ...data, coach_name: coach?.name },
            type: 'coachNewBooking',
            recipient: coachEmail
          })
        })
      }
    } catch (coachEmailError) {
      console.error('Failed to send coach email:', coachEmailError)
      // Don't fail the booking if email fails
    }
    
    return NextResponse.json({ data })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
