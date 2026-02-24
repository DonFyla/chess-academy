import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK || 'https://wa.link/uj48gk'

const BANK_DETAILS = {
  bankName: 'Guarantee Trust Bank(GTB)',
  accountNumber: '0449558330',
  accountName: 'Moving Train Chess Academy Ltd',
}

// Email templates for points system
const emailTemplates = {
  pointsPurchasePending: (data) => {
    const ref = data.reference?.slice(0, 8).toUpperCase() || 'PENDING'
    return {
      subject: 'Points Purchase Pending - Complete Payment 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
            <p style="color: #666;">Nigeria's Leading Online Chess Academy for Kids</p>
          </div>
          
          <h2 style="color: #5E5044;">Points Purchase Reserved!</h2>
          <p>Hello ${data.student_name},</p>
          <p>Thank you for purchasing points! Your points purchase is pending payment confirmation.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Purchase Details</h3>
            <p><strong>Points:</strong> ${data.points_amount}</p>
            <p><strong>Amount:</strong> ₦${parseInt(data.total_amount).toLocaleString()}</p>
            <p><strong>Reference:</strong> ${ref}</p>
            <p><strong>Status:</strong> Pending Payment</p>
          </div>
          
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2E7D32;">💳 Make Your Payment</h3>
            <p>Please make payment to complete your purchase:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p style="margin: 5px 0;"><strong>Bank:</strong> ${BANK_DETAILS.bankName}</p>
              <p style="margin: 5px 0;"><strong>Account Number:</strong> ${BANK_DETAILS.accountNumber}</p>
              <p style="margin: 5px 0;"><strong>Account Name:</strong> ${BANK_DETAILS.accountName}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${parseInt(data.total_amount).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${ref}</p>
            </div>
          </div>
          
          <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #E65100;">📱 Confirm Your Payment</h3>
            <p>After making the transfer:</p>
            <ol>
              <li>Take a screenshot of the payment receipt</li>
              <li>Click the button below to send it via WhatsApp</li>
              <li>We'll verify and add points to your account within 24 hours</li>
            </ol>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${WHATSAPP_LINK}" 
                 style="display: inline-block; background: #25D366; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 25px; font-weight: bold;">
                📤 Send Payment Receipt via WhatsApp
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 15px;">
              <strong>Important:</strong> Include your reference <strong>${ref}</strong> and the payment receipt screenshot in your WhatsApp message.
            </p>
          </div>
          
          <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1565C0; font-size: 14px;">
              <strong>⏰ Note:</strong> Points are valid for 1 year from purchase date.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
          </p>
        </div>
      `
    }
  },

  pointsPurchaseConfirmed: (data) => {
    return {
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
          
          <p>Hello ${data.student_name},</p>
          <p>We've received your payment and <strong>${data.points_amount} points</strong> have been added to your account!</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #5E5044;">Your New Balance</h3>
            <p style="font-size: 48px; font-weight: bold; color: #5E5044; margin: 10px 0;">${data.new_balance}</p>
            <p style="color: #666;">points</p>
          </div>
          
          <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565C0;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Visit your <a href="https://www.themovingtrain.org/dashboard">Dashboard</a> to see your balance</li>
              <li>Browse coaches at <a href="https://www.themovingtrain.org/book-with-points">Book with Points</a></li>
              <li>Book flexible classes whenever you're available</li>
              <li>Points expire on: <strong>${data.expires_at ? new Date(data.expires_at).toLocaleDateString() : '1 year from now'}</strong></li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/book-with-points" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 25px; font-weight: bold;">
              Book a Class Now
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
  },

  flexibleBookingConfirmed: (data) => {
    const sessionDate = new Date(data.session_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    return {
      subject: 'Class Booking Confirmed! 🎓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
          </div>
          
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4CAF50;">
            <h2 style="color: #2E7D32; margin: 0;">✅ Booking Confirmed!</h2>
          </div>
          
          <p>Hello ${data.student_name},</p>
          <p>Your class with <strong>${data.coach_name}</strong> has been confirmed!</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Class Details</h3>
            <p><strong>Coach:</strong> ${data.coach_name}</p>
            <p><strong>Date:</strong> ${sessionDate}</p>
            <p><strong>Time:</strong> ${data.start_time} - ${data.end_time}</p>
            <p><strong>Points Used:</strong> ${data.points_used}</p>
            <p><strong>Remaining Balance:</strong> ${data.remaining_balance} points</p>
          </div>
          
          ${data.meeting_link ? `
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2E7D32;">🔗 Your Meeting Link</h3>
            <p>Join your class using this link:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; word-break: break-all;">
              <a href="${data.meeting_link}" style="color: #2E7D32; font-weight: bold;">${data.meeting_link}</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">
              Please save this link and join on time.
            </p>
          </div>
          ` : ''}
          
          <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #FF9800;">
            <h3 style="margin-top: 0; color: #E65100; font-size: 16px;">⚠️ Cancellation Policy</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
              <li>You can cancel up to <strong>24 hours</strong> before the class for a full point refund</li>
              <li>Cancellations less than 24 hours before will not be refunded</li>
              <li>Manage your bookings in your <a href="https://www.themovingtrain.org/dashboard">Dashboard</a></li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy<br>
            <a href="https://www.themovingtrain.org" style="color: #5E5044;">www.themovingtrain.org</a>
          </p>
        </div>
      `
    }
  },

  pointsRefundNotification: (data) => {
    return {
      subject: 'Points Refund Processed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5E5044; margin: 0;">Moving Train Chess Academy</h1>
          </div>
          
          <h2 style="color: #5E5044;">Points Refunded</h2>
          <p>Hello ${data.student_name},</p>
          <p>Your booking has been cancelled and points have been refunded to your account.</p>
          
          <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #2E7D32;">Refund Details</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2E7D32; margin: 10px 0;">+${data.refund_amount} points</p>
            <p style="color: #666;">New Balance: <strong>${data.new_balance} points</strong></p>
          </div>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Cancelled Class</h3>
            <p><strong>Coach:</strong> ${data.coach_name}</p>
            <p><strong>Date:</strong> ${new Date(data.session_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${data.start_time} - ${data.end_time}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.themovingtrain.org/book-with-points" 
               style="display: inline-block; background: #5E5044; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 25px; font-weight: bold;">
              Book Another Class
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy
          </p>
        </div>
      `
    }
  },

  coachFlexibleBookingNotification: (data) => {
    const sessionDate = new Date(data.session_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    return {
      subject: `New Flexible Booking - ${data.student_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5E5044;">New Class Booking</h2>
          <p>Hello ${data.coach_name},</p>
          <p>A student has booked a class with you using the flexible points system.</p>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Student Details</h3>
            <p><strong>Name:</strong> ${data.student_name}</p>
            <p><strong>Email:</strong> ${data.student_email}</p>
            <p><strong>Phone:</strong> ${data.student_phone || 'Not provided'}</p>
          </div>
          
          <div style="background: #F5EFE7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #5E5044;">Class Details</h3>
            <p><strong>Date:</strong> ${sessionDate}</p>
            <p><strong>Time:</strong> ${data.start_time} - ${data.end_time}</p>
            <p><strong>Points Earned:</strong> ${data.points_used}</p>
          </div>
          
          ${data.meeting_link ? `
          <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1565C0;">
              <strong>🎯 Meeting Link:</strong> ${data.meeting_link}
            </p>
          </div>
          ` : `
          <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #FF9800;">
            <p style="margin: 0; color: #E65100;">
              <strong>⚠️ No Meeting Link Set:</strong> Please set your meeting link in your coach dashboard.
            </p>
          </div>
          `}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Moving Train Online Chess Academy
          </p>
        </div>
      `
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, data } = body

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

    const { subject, html } = template(data)

    // Determine recipient
    let to = data.student_email || data.coach_email
    
    if (!to) {
      return NextResponse.json(
        { error: 'No recipient email address' },
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

    const result = await res.json()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
