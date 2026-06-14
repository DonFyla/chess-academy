// Supabase Edge Function: Send Booking Confirmation Email
// This function sends an email when a booking is confirmed by a coach

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const WHATSAPP_LINK = 'https://wa.link/uj48gk'

interface BookingData {
  student_email: string
  student_name: string
  coach_name: string
  booking_date: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'rejected'
}

serve(async (req) => {
  try {
    const { booking }: { booking: BookingData } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    // Format date for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }

    // Format time for display
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }

    const subject = booking.status === 'confirmed' 
      ? 'Your Chess Lesson Booking is Confirmed! 🎉'
      : 'Update on Your Chess Lesson Booking'

    const html = booking.status === 'confirmed'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #5E5044;">Booking Confirmed!</h1>
          <p>Hello ${booking.student_name},</p>
          <p>Great news! Your chess lesson has been confirmed.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
          </div>
          
          <p>To complete your registration and make payment, please click the button below:</p>
          
          <a href="${WHATSAPP_LINK}" 
             style="display: inline-block; background: #5E5044; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 25px; margin: 20px 0;">
            Complete Payment via WhatsApp
          </a>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please reply to this email or contact us via WhatsApp.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Moving Train Online Chess Academy<br>
            Nigeria's Leading Online Chess Academy for Kids
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #5E5044;">Booking Update</h1>
          <p>Hello ${booking.student_name},</p>
          <p>We regret to inform you that your booking request could not be confirmed at this time.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
          </div>
          
          <p>Please try booking a different time slot or contact us for assistance.</p>
          
          <a href="${WHATSAPP_LINK}" 
             style="display: inline-block; background: #5E5044; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 25px; margin: 20px 0;">
            Contact Us on WhatsApp
          </a>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Moving Train Online Chess Academy<br>
            Nigeria's Leading Online Chess Academy for Kids
          </p>
        </div>
      `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Moving Train Chess Academy <bookings@themovingtrain.org>',
        to: booking.student_email,
        subject: subject,
        html: html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await res.json()

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
