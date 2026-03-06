import { NextResponse } from 'next/server'

// Bank account details for payment
const BANK_DETAILS = {
  bankName: 'Guarantee Trust Bank(GTB)',
  accountNumber: '0449558330',
  accountName: 'Moving Train Chess Academy Ltd',
}

// WhatsApp link for payment confirmation
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || 'https://wa.link/uj48gk'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Helper to format session dates
function formatSessionDates(sessionDates) {
  if (!sessionDates || !Array.isArray(sessionDates) || sessionDates.length === 0) {
    return 'Not specified'
  }
  
  // Sort by date
  const sorted = [...sessionDates].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Format first 3 sessions and indicate if there are more
  const formatted = sorted.slice(0, 3).map(session => {
    const date = new Date(session.date)
    const dayName = daysOfWeek[date.getDay()]
    return `${dayName}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${session.start_time?.slice(0, 5)}`
  })
  
  if (sorted.length > 3) {
    formatted.push(`... and ${sorted.length - 3} more`)
  }
  
  return formatted.join('<br>')
}

const emailTemplates = {
  studentBookingReceived: (booking) => {
    const totalAmount = booking.total_amount || 0
    const sessionDatesHtml = formatSessionDates(booking.session_dates)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: 'Your Special Coaching Booking is Reserved! Complete Payment to Confirm 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Elite Chess Coaching</p>
          </div>
          
          <h2 style="color: #5E5044;">Your Special Coaching Spot is Reserved!</h2>
          <p>Hello ${booking.student_name},</p>
          <p>Great news! We've reserved your special coaching sessions with <strong>${booking.coach_name}</strong>. Your booking is pending payment to be fully confirmed.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Your Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Total Sessions:</strong> ${booking.total_sessions}</p>
            <p><strong>Scheduled Dates:</strong><br>${sessionDatesHtml}</p>
            <p><strong>Amount Due:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            ${booking.is_recurring ? `<p><strong>Type:</strong> Recurring weekly sessions</p>` : ''}
          </div>
          
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2E7D32;">💳 Make Your Payment</h3>
            <p>Please make payment to secure your booking:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p style="margin: 5px 0;"><strong>Bank:</strong> ${BANK_DETAILS.bankName}</p>
              <p style="margin: 5px 0;"><strong>Account Number:</strong> ${BANK_DETAILS.accountNumber}</p>
              <p style="margin: 5px 0;"><strong>Account Name:</strong> ${BANK_DETAILS.accountName}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${bookingRef}</p>
            </div>
          </div>
          
          <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #E65100;">📱 Confirm Your Payment</h3>
            <p>After making the transfer:</p>
            <ol>
              <li>Take a screenshot of the payment receipt</li>
              <li>Click the button below to send it via WhatsApp</li>
              <li>We'll verify and confirm your booking within 24 hours</li>
            </ol>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${WHATSAPP_LINK}?text=Hello! I've made payment for Special Coaching.%0A%0AReference: ${bookingRef}%0AAmount: ₦${parseInt(totalAmount).toLocaleString()}%0ACoach: ${booking.coach_name}%0ASessions: ${booking.total_sessions}%0A%0AAttached is my payment receipt." 
                 style="display: inline-block; background: #25D366; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 25px; font-weight: bold;">
                📤 Send Payment Receipt via WhatsApp
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 15px;">
              <strong>Important:</strong> Include your booking reference <strong>${bookingRef}</strong> and the payment receipt screenshot in your WhatsApp message.
            </p>
          </div>
          
          <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1565C0; font-size: 14px;">
              <strong>⏰ Note:</strong> Your spot is held for 48 hours. Please complete payment within this time to secure your booking.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Questions?</strong> Reply to this email or contact us via WhatsApp.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
          </p>
        </div>
      `
    }
  },
  
  coachNewBooking: (booking) => {
    const totalAmount = booking.total_amount || 0
    const sessionDatesHtml = formatSessionDates(booking.session_dates)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: `New Special Booking - ${booking.student_name} (Pending Payment)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5E5044;">New Special Coaching Booking</h2>
          <p>Hello ${booking.coach_name},</p>
          <p>A new student has reserved special coaching sessions with you! The booking is pending payment.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Student Details</h3>
            <p><strong>Name:</strong> ${booking.student_name}</p>
            <p><strong>Email:</strong> ${booking.student_email}</p>
            <p><strong>Phone:</strong> ${booking.student_phone || 'Not provided'}</p>
            <p><strong>Total Sessions:</strong> ${booking.total_sessions}</p>
            <p><strong>Scheduled Dates:</strong><br>${sessionDatesHtml}</p>
            ${booking.is_recurring ? `<p><strong>Type:</strong> Recurring weekly</p>` : ''}
            <p><strong>Total Amount:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
          </div>
          
          <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #E65100;">
              <strong>⏰ Action Required:</strong> Please wait for payment confirmation before scheduling these sessions.
            </p>
          </div>
          
          <p>You'll receive another notification once payment is confirmed.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy
          </p>
        </div>
      `
    }
  },
  
  studentPaymentConfirmed: (booking) => {
    const sessionDatesHtml = formatSessionDates(booking.session_dates)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: 'Payment Confirmed! Your Special Coaching is Booked ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
          </div>
          
          <div style="background: #E8F5E9; border: 2px solid #4CAF50; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #2E7D32; margin-top: 0;">✅ Payment Confirmed!</h2>
            <p>Hello ${booking.student_name},</p>
            <p>Your payment has been received and your special coaching sessions are now confirmed!</p>
          </div>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Confirmed Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Total Sessions:</strong> ${booking.total_sessions}</p>
            <p><strong>Scheduled Dates:</strong><br>${sessionDatesHtml}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            ${booking.meeting_link ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Meeting Link:</strong></p>
              <a href="${booking.meeting_link}" style="color: #5E5044; word-break: break-all;">${booking.meeting_link}</a>
            </div>
            ` : ''}
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Your coach will reach out to you shortly with more details. Looking forward to your sessions!
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
          </p>
        </div>
      `
    }
  }
}

export async function POST(request) {
  try {
    const { booking, type, recipient } = await request.json()
    
    console.log('Sending special booking email:', { type, recipient, bookingId: booking.id })
    
    if (!booking || !type || !recipient) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const template = emailTemplates[type]
    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Invalid email type' },
        { status: 400 }
      )
    }
    
    const { subject, html } = template(booking)
    
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json(
        { success: false, message: 'Email service not configured' },
        { status: 500 }
      )
    }
    
    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Moving Train Chess Academy <info@themovingtrain.org>',
        to: recipient,
        subject,
        html,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Resend API error:', error)
      throw new Error(error.message || 'Failed to send email')
    }
    
    const result = await response.json()
    console.log('Email sent successfully:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      id: result.id 
    })
    
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
