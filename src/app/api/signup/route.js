import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client to bypass RLS
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

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map()

function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const attempts = rateLimitMap.get(ip)
  
  if (!attempts) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true }
  }
  
  if (now - attempts.firstAttempt > windowMs) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true }
  }
  
  if (attempts.count >= maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((attempts.firstAttempt + windowMs - now) / 1000) }
  }
  
  attempts.count++
  return { allowed: true }
}

// Verify reCAPTCHA token
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification')
    return { success: true }
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
    })
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error)
    return { success: false, error: 'Verification failed' }
  }
}

// Check for suspicious patterns
function isSuspiciousSignup(email, name) {
  const lowerEmail = email.toLowerCase()
  
  // Pattern 1: Random dots in local part (e.g., ga.r.i.sir.a.6.4@gmail.com)
  const dotPattern = /^([a-z]\.){4,}/
  if (dotPattern.test(lowerEmail)) return 'suspicious_email_pattern'
  
  // Pattern 2: Too many dots in email
  const dotCount = (lowerEmail.match(/\./g) || []).length
  if (dotCount > 5) return 'too_many_dots'
  
  // Pattern 3: Name with excessive consonants (random characters)
  if (name) {
    const consonantPattern = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{8,}/
    if (consonantPattern.test(name)) return 'suspicious_name'
    
    // Pattern 4: Alternating case pattern (e.g., jitAbHAJyhbmooxf)
    const capsPattern = /[a-z][A-Z][a-z][A-Z]/
    if (capsPattern.test(name)) return 'suspicious_caps_pattern'
  }
  
  return null
}

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Rate limiting
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    const { email, password, name, phone, honeypot, recaptchaToken } = body
    
    // Honeypot check (if field is filled, it's a bot)
    if (honeypot) {
      console.log('Bot signup attempt detected (honeypot):', email)
      // Return fake success to not alert the bot
      return NextResponse.json(
        { success: true, message: 'Account created successfully' },
        { status: 200 }
      )
    }
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    // Check for suspicious patterns
    const suspiciousReason = isSuspiciousSignup(email, name)
    if (suspiciousReason) {
      console.log('Suspicious signup detected:', { email, name, reason: suspiciousReason })
      return NextResponse.json(
        { error: 'Invalid signup data. Please check your information and try again.' },
        { status: 400 }
      )
    }
    
    // Verify reCAPTCHA if configured
    if (recaptchaToken && RECAPTCHA_SECRET) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken)
      if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        return NextResponse.json(
          { error: 'Security check failed. Please try again.' },
          { status: 400 }
        )
      }
    }
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        full_name: name || '',
        phone: phone || ''
      }
    })
    
    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }
    
    // Send confirmation email
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
      }
    })
    
    if (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the signup, just log the error
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Account created! Please check your email to confirm.',
        user: { id: authData.user.id, email: authData.user.email }
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
