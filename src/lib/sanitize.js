// Input sanitization utilities
// Prevents XSS, SQL injection, and other injection attacks

// Sanitize string input - removes HTML tags and dangerous characters
export function sanitizeString(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return ''
  
  // Trim whitespace
  let sanitized = input.trim()
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  
  // Remove potentially dangerous characters but keep basic punctuation
  // Allow: letters, numbers, spaces, common punctuation
  sanitized = sanitized.replace(/[<>\"'&;\(\)\{\}\[\]\`]/g, '')
  
  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '')
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFC')
  
  return sanitized
}

// Sanitize email - stricter validation
export function sanitizeEmail(input) {
  if (!input || typeof input !== 'string') return ''
  
  const email = input.trim().toLowerCase()
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return ''
  }
  
  // Limit length
  if (email.length > 254) {
    return ''
  }
  
  return email
}

// Sanitize phone number
export function sanitizePhone(input) {
  if (!input || typeof input !== 'string') return ''
  
  // Remove all non-numeric characters except + for international
  const phone = input.trim().replace(/[^\d+]/g, '')
  
  // Limit length (international max is 15 digits + 1 for +)
  if (phone.length > 16) {
    return phone.substring(0, 16)
  }
  
  return phone
}

// Sanitize UUID
export function sanitizeUUID(input) {
  if (!input || typeof input !== 'string') return ''
  
  const uuid = input.trim().toLowerCase()
  
  // UUID v4 regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(uuid)) {
    return ''
  }
  
  return uuid
}

// Sanitize number (integer)
export function sanitizeInt(input, min = 0, max = 1000000) {
  const num = parseInt(input, 10)
  
  if (isNaN(num)) return min
  if (num < min) return min
  if (num > max) return max
  
  return num
}

// Sanitize booking/payment data object
export function sanitizeBookingData(data) {
  return {
    student_name: sanitizeString(data.student_name, 100),
    student_email: sanitizeEmail(data.student_email),
    student_phone: sanitizePhone(data.student_phone),
    notes: sanitizeString(data.notes, 1000),
    course_type: sanitizeString(data.course_type, 50),
    coach_id: sanitizeUUID(data.coach_id),
  }
}

// Validate and sanitize signup data
export function sanitizeSignupData(data) {
  return {
    email: sanitizeEmail(data.email),
    password: typeof data.password === 'string' ? data.password : '', // Don't sanitize password, just validate
    name: sanitizeString(data.name, 100),
    phone: sanitizePhone(data.phone),
  }
}

// Check if data contains potential SQL injection patterns
export function containsSQLInjection(input) {
  if (!input || typeof input !== 'string') return false
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FROM|WHERE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /(\bOR\b|\bAND\b)\s+['"]\w+['"]\s*=\s*['"]\w+['"]/i,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

// Comprehensive validation for API inputs
export function validateApiInput(data, rules) {
  const errors = []
  const sanitized = {}
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    
    // Check required
    if (rule.required && (!value || value === '')) {
      errors.push(`${field} is required`)
      continue
    }
    
    // Skip if optional and empty
    if (!rule.required && (!value || value === '')) {
      continue
    }
    
    // Check SQL injection
    if (value && containsSQLInjection(value)) {
      errors.push(`${field} contains invalid characters`)
      continue
    }
    
    // Sanitize based on type
    switch (rule.type) {
      case 'email':
        sanitized[field] = sanitizeEmail(value)
        if (!sanitized[field]) {
          errors.push(`${field} is not a valid email`)
        }
        break
        
      case 'string':
        sanitized[field] = sanitizeString(value, rule.maxLength || 500)
        break
        
      case 'phone':
        sanitized[field] = sanitizePhone(value)
        break
        
      case 'uuid':
        sanitized[field] = sanitizeUUID(value)
        if (!sanitized[field]) {
          errors.push(`${field} is not a valid ID`)
        }
        break
        
      case 'int':
        sanitized[field] = sanitizeInt(value, rule.min, rule.max)
        break
        
      default:
        sanitized[field] = sanitizeString(value, rule.maxLength || 500)
    }
  }
  
  return { valid: errors.length === 0, errors, sanitized }
}
