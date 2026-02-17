import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const WHATSAPP_LINK = 'https://wa.link/uj48gk'

export async function POST(request) {
  try {
    const { booking } = await request.json()

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Format date for display
    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }

    // Format time for display
    const formatTime = (timeStr) => {
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
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <h2 style="color: #5E5044;">Booking Confirmed!</h2>
          <p>Hello ${booking.student_name},</p>
          <p>Great news! Your chess lesson has been confirmed.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
            ${booking.course_type ? `<p><strong>Course:</strong> ${booking.course_type.charAt(0).toUpperCase() + booking.course_type.slice(1)}</p>` : ''}
          </div>
          
          <p>To complete your registration and make payment, please click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${WHATSAPP_LINK}" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 25px; font-weight: bold;">
              Complete Payment via WhatsApp
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please reply to this email or contact us via WhatsApp.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <h2 style="color: #5E5044;">Booking Update</h2>
          <p>Hello ${booking.student_name},</p>
          <p>We regret to inform you that your booking request could not be confirmed at this time.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
          </div>
          
          <p>Please try booking a different time slot or contact us for assistance.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/book" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 25px; font-weight: bold;">
              Book Another Time
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
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
      console.error('Resend API error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
