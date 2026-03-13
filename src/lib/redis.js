// Redis client for rate limiting and caching
// Uses Upstash Redis (free tier: 10k requests/day)

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Check if Redis is configured
const isRedisConfigured = () => {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

// Rate limiters for different endpoints
const rateLimiters = {
  // Signup: 5 attempts per 15 minutes per IP
  signup: new Ratelimit({
    redis: isRedisConfigured() ? redis : undefined,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
  }),
  
  // Login: 10 attempts per 15 minutes per IP
  login: new Ratelimit({
    redis: isRedisConfigured() ? redis : undefined,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    analytics: true,
  }),
  
  // Booking creation: 10 attempts per hour per IP
  booking: new Ratelimit({
    redis: isRedisConfigured() ? redis : undefined,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
  }),
  
  // Points purchase: 5 attempts per hour per IP
  points: new Ratelimit({
    redis: isRedisConfigured() ? redis : undefined,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
  }),
  
  // Generic API: 100 requests per minute per IP
  api: new Ratelimit({
    redis: isRedisConfigured() ? redis : undefined,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),
}

// Fallback in-memory rate limiting for development
const memoryStore = new Map()

function checkMemoryRateLimit(key, limit, windowMs) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Get existing attempts
  const attempts = memoryStore.get(key) || []
  
  // Filter to current window
  const validAttempts = attempts.filter(time => time > windowStart)
  
  if (validAttempts.length >= limit) {
    return { allowed: false, retryAfter: Math.ceil((attempts[0] + windowMs - now) / 1000) }
  }
  
  validAttempts.push(now)
  memoryStore.set(key, validAttempts)
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of memoryStore.entries()) {
      memoryStore.set(k, v.filter(time => time > windowStart))
    }
  }
  
  return { allowed: true }
}

// Main rate limiting function
export async function checkRateLimit(type, identifier) {
  // If Redis not configured, use memory fallback
  if (!isRedisConfigured()) {
    const limits = {
      signup: { limit: 5, window: 15 * 60 * 1000 },
      login: { limit: 10, window: 15 * 60 * 1000 },
      booking: { limit: 10, window: 60 * 60 * 1000 },
      points: { limit: 5, window: 60 * 60 * 1000 },
      api: { limit: 100, window: 60 * 1000 },
    }
    const config = limits[type] || limits.api
    return checkMemoryRateLimit(`${type}:${identifier}`, config.limit, config.window)
  }
  
  // Use Redis rate limiter
  const limiter = rateLimiters[type] || rateLimiters.api
  const { success, limit, reset, remaining } = await limiter.limit(identifier)
  
  return {
    allowed: success,
    limit,
    remaining,
    reset,
    retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
  }
}

// Export Redis client for other uses
export { redis, isRedisConfigured }
