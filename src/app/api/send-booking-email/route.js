import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || 'https://wa.link/uj48gk'

// Bank account details for payment
const BANK_DETAILS = {
  bankName: 'Guarantee Trust Bank(GTB)',
  accountNumber: '0449558330',
  accountName: 'Moving Train Chess Academy Ltd',
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Helper to format schedule with day + time
function formatSchedule(booking) {
  if (!booking.recurring_days || booking.recurring_days.length === 0) {
    return 'Not specified'
  }
  
  // For single day booking
  if (booking.recurring_days.length === 1) {
    const day = daysOfWeek[booking.recurring_days[0]]
    return `${day} ${booking.start_time} - ${booking.end_time}`
  }
  
  // For two day booking, we need to get times from recurring_dates
  if (booking.recurring_dates && Array.isArray(booking.recurring_dates)) {
    // Group by day of week to get the time for each day
    const scheduleItems = booking.recurring_days.map(dayIndex => {
      const dayName = daysOfWeek[dayIndex]
      // Find a date that matches this day of week
      const dateInfo = booking.recurring_dates.find(d => {
        const date = new Date(d.date)
        return date.getDay() === dayIndex
      })
      if (dateInfo) {
        return `${dayName} ${dateInfo.start_time} - ${dateInfo.end_time}`
      }
      return `${dayName} ${booking.start_time} - ${booking.end_time}`
    })
    return scheduleItems.join(' and ')
  }
  
  // Fallback
  const dayNames = booking.recurring_days.map(d => daysOfWeek[d]).join(' and ')
  return `${dayNames} ${booking.start_time} - ${booking.end_time}`
}

const emailTemplates = {
  studentBookingReceived: (booking) => {
    const totalAmount = booking.monthly_amount || 0
    const schedule = formatSchedule(booking)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: 'Your Booking is Reserved! Complete Payment to Confirm 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <h2 style="color: #5E5044;">Your Spot is Reserved!</h2>
          <p>Hello ${booking.student_name},</p>
          <p>Great news! We've reserved your spot with <strong>${booking.coach_name}</strong>. Your booking is pending payment to be fully confirmed.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Your Booking Details</h3>
            <p><strong>Coach:</strong> ${booking.coach_name}</p>
            <p><strong>Schedule:</strong> ${schedule}</p>
            <p><strong>Total Sessions:</strong> ${booking.sessions_per_month || 4}</p>
            <p><strong>Amount Due:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
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
              <a href="${WHATSAPP_LINK}" 
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
    const totalAmount = booking.monthly_amount || 0
    const schedule = formatSchedule(booking)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: `New Booking - ${booking.student_name} (Pending Payment)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5E5044;">New Booking Reserved</h2>
          <p>Hello ${booking.coach_name},</p>
          <p>A new student has reserved a spot with you! The booking is pending payment.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Student Details</h3>
            <p><strong>Name:</strong> ${booking.student_name}</p>
            <p><strong>Email:</strong> ${booking.student_email}</p>
            <p><strong>Phone:</strong> ${booking.student_phone || 'Not provided'}</p>
            <p><strong>Course Type:</strong> ${booking.course_type || 'Not specified'}</p>
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Schedule</h3>
            <p><strong>Schedule:</strong> ${schedule}</p>
            <p><strong>Total Sessions:</strong> ${booking.sessions_per_month || 4}</p>
            <p><strong>Amount:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>Reference:</strong> ${bookingRef}</p>
          </div>
          
          <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #E65100;">
              <strong>⏳ Status:</strong> Awaiting payment. You'll be notified once the student completes payment.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy
          </p>
        </div>
      `
    }
  },

  studentBookingConfirmed: (booking) => {
    const totalAmount = booking.monthly_amount || 0
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    const schedule = formatSchedule(booking)
    
    return {
      subject: 'Payment Received! Your Lessons Are Confirmed 🎓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4CAF50;">
            <h2 style="color: #2E7D32; margin: 0;">✅ Payment Confirmed!</h2>
            <p style="margin: 10px 0 0 0; color: #2E7D32;">Your booking is now fully confirmed</p>
          </div>
          
          <p>Hello ${booking.student_name},</p>
          <p>We've received your payment of <strong>₦${parseInt(totalAmount).toLocaleString()}</strong> and your lessons with <strong>${booking.coach_name}</strong> are now confirmed!</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Your Confirmed Schedule</h3>
            <p><strong>Schedule:</strong> ${schedule}</p>
            <p><strong>Total Sessions:</strong> ${booking.sessions_per_month || 4}</p>
            <p><strong>Amount Paid:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            <p><strong>First Lesson:</strong> ${booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
          </div>
          
          ${booking.meeting_link ? `
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2E7D32;">🔗 Your Meeting Link</h3>
            <p>Join your lessons using this link:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; word-break: break-all;">
              <a href="${booking.meeting_link}" style="color: #2E7D32; font-weight: bold;">${booking.meeting_link}</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">
              Please save this link and join on time for each lesson.
            </p>
          </div>
          ` : ''}
          
          <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565C0;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Ensure you have a <strong>stable internet connection</strong> for video calls</li>
              <li>Prepare a quiet space for the lessons</li>
              <li>Test your camera and microphone before the first lesson</li>
              <li>Be ready to learn and have fun!</li>
            </ul>
          </div>
          
          <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #FF9800;">
            <h3 style="margin-top: 0; color: #E65100; font-size: 16px;">⚠️ Rescheduling Policy</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
              <li>Our coaches work <strong>strictly with time</strong></li>
              <li>Only <strong>one rescheduling per month</strong> is allowed</li>
              <li>Rescheduling requests must be made <strong>at least 12 hours</strong> before the lesson</li>
              <li>Late requests may not be accommodated</li>
            </ul>
          </div>
          
          <div style="background: #FFF8E1; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #F57C00; font-size: 14px;">
              <strong>📋 Save Your Reference:</strong> ${bookingRef} - You'll need this for any communication about your booking.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Questions or need to reschedule?</strong> Contact us via WhatsApp or reply to this email.
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

  coachBookingConfirmed: (booking) => {
    const totalAmount = booking.monthly_amount || 0
    const schedule = formatSchedule(booking)
    const bookingRef = booking.id?.slice(0, 8).toUpperCase() || 'PENDING'
    
    return {
      subject: `Payment Received - ${booking.student_name} Confirmed ✅`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="color: #2E7D32; margin: 0;">✅ Payment Received & Confirmed</h2>
          </div>
          
          <p>Hello ${booking.coach_name},</p>
          <p>Great news! Payment has been received from <strong>${booking.student_name}</strong> and their booking is now fully confirmed.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Student Details</h3>
            <p><strong>Name:</strong> ${booking.student_name}</p>
            <p><strong>Email:</strong> ${booking.student_email}</p>
            <p><strong>Phone:</strong> ${booking.student_phone || 'Not provided'}</p>
            <p><strong>Reference:</strong> ${bookingRef}</p>
          </div>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Confirmed Schedule</h3>
            <p><strong>Schedule:</strong> ${schedule}</p>
            <p><strong>Total Sessions:</strong> ${booking.sessions_per_month || 4}</p>
            <p><strong>Amount Paid:</strong> ₦${parseInt(totalAmount).toLocaleString()}</p>
            <p><strong>First Lesson:</strong> ${booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
          </div>
          
          <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1565C0;">
              <strong>🎯 Action Required:</strong> Please contact the student with your Zoom/meeting details before the first lesson.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy
          </p>
        </div>
      `
    }
  },

  studentBookingRejected: (booking) => {
    return {
      subject: 'Update on Your Booking Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <h2 style="color: #5E5044;">Booking Update</h2>
          <p>Hello ${booking.student_name},</p>
          <p>We regret to inform you that your booking request with ${booking.coach_name} could not be confirmed at this time.</p>
          
          ${booking.admin_notes ? `<p><strong>Message from Coach:</strong> ${booking.admin_notes}</p>` : ''}
          
          <p>This could be due to schedule conflicts or availability. Please try booking with a different coach or time slot.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/book" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 25px; font-weight: bold;">
              Book Another Coach
            </a>
          </div>
          
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
    const { type, booking, recipient } = await request.json()

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const template = emailTemplates[type]
    if (!template) {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      )
    }

    const { subject, html } = template(booking)

    // Determine recipient: use provided recipient param, or fallback to booking object
    let to = recipient
    console.log(`📧 Email type: ${type}, recipient param: ${recipient}`)
    
    if (!to) {
      if (type.startsWith('student')) {
        to = booking.student_email
      } else if (type.startsWith('coach')) {
        to = booking.coach_email
      }
    }

    console.log(`📧 Final recipient: ${to}`)

    if (!to) {
      return NextResponse.json(
        { error: 'No recipient email address', type, recipient, booking_email: booking.student_email || booking.coach_email },
        { status: 400 }
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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
