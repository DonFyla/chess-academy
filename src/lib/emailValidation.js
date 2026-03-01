/**
 * Email validation utilities to detect suspicious/bot emails
 */

// Common patterns in bot-generated emails
const SUSPICIOUS_PATTERNS = [
  // Random dots in local part (e.g., ga.r.i.sir.a.6.4@gmail.com)
  /^[a-z]\.[a-z]\.[a-z]\.[a-z]+\.[a-z]\.\d+@/i,
  // Random characters with dots (e.g., n.u.je.m.ur.u.ra.46.9@gmail.com)
  /^([a-z]\.){5,}[a-z0-9]+@/i,
  // Excessive dots in local part
  /(?:\.[a-z0-9]){4,}@/i,
]

// Disposable email domains (common list)
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.com',
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  'sharklasers.com',
  'getairmail.com',
  'temp-mail.org',
  'fake-email.com',
  'tempinbox.com',
  'mailnesia.com',
  'mailcatch.com',
  'trashmail.com',
  'mytrashmail.com',
  'mailforspam.com',
  'spamgourmet.com',
  'getnada.com',
  'anonymbox.com',
  'burnermail.io',
  'tempmailaddress.com',
]

/**
 * Check if email looks suspicious (bot-generated)
 */
export function isSuspiciousEmail(email) {
  if (!email || typeof email !== 'string') return true
  
  const lowerEmail = email.toLowerCase()
  
  // Check disposable domains
  const domain = lowerEmail.split('@')[1]
  if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
    return true
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerEmail)) {
      return true
    }
  }
  
  return false
}

/**
 * Check if name looks suspicious (random characters)
 */
export function isSuspiciousName(name) {
  if (!name || typeof name !== 'string') return true
  
  // Too short
  if (name.length < 3) return true
  
  // Too long (bots often use long random strings)
  if (name.length > 30) return true
  
  // Random character patterns (alternating case, no spaces, etc.)
  // Examples: jitAbHAJyhbmooxf, LpnUaetcNyqxNyYH
  
  // Check for excessive consonants in a row (unlikely in real names)
  const excessiveConsonants = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{6,}/
  if (excessiveConsonants.test(name)) return true
  
  // Check for random capitalization patterns
  // Real names: John Smith, Mary Jane
  // Bot names: jitAbHAJyhbmooxf
  const capsPattern = /[a-z][A-Z][a-z][A-Z]/
  if (capsPattern.test(name)) return true
  
  // No vowels (very unlikely in real names)
  const vowels = /[aeiouAEIOU]/
  if (!vowels.test(name)) return true
  
  return false
}

/**
 * Rate limiting check - simple in-memory store
 * In production, use Redis or database
 */
const signupAttempts = new Map()

export function checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const attempts = signupAttempts.get(identifier)
  
  if (!attempts) {
    signupAttempts.set(identifier, { count: 1, firstAttempt: now })
    return { allowed: true, remaining: maxAttempts - 1 }
  }
  
  // Reset if window has passed
  if (now - attempts.firstAttempt > windowMs) {
    signupAttempts.set(identifier, { count: 1, firstAttempt: now })
    return { allowed: true, remaining: maxAttempts - 1 }
  }
  
  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    const retryAfter = Math.ceil((attempts.firstAttempt + windowMs - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  // Increment attempt count
  attempts.count++
  return { allowed: true, remaining: maxAttempts - attempts.count }
}

/**
 * Validate signup data comprehensively
 */
export function validateSignupData(email, name, honeypotValue) {
  const errors = []
  
  // Honeypot check
  if (honeypotValue) {
    return { valid: false, errors: ['Bot detected'] }
  }
  
  // Email validation
  if (!email || !email.includes('@')) {
    errors.push('Valid email is required')
  } else if (isSuspiciousEmail(email)) {
    errors.push('Please use a valid email address')
  }
  
  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name is required')
  } else if (isSuspiciousName(name)) {
    errors.push('Please enter a valid name')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
