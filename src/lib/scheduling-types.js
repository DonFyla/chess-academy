// Type definitions for the scheduling system
// These are JSDoc comments for type safety in JavaScript

/**
 * @typedef {Object} Coach
 * @property {string} id
 * @property {string} name
 * @property {string|null} bio
 * @property {string|null} photo_url
 * @property {string|null} specialization
 * @property {string|null} user_id
 * @property {boolean} is_admin
 * @property {string} created_at
 */

/**
 * @typedef {Object} AvailabilitySlot
 * @property {string} id
 * @property {string} coach_id
 * @property {number} day_of_week - 0-6 (Sunday to Saturday)
 * @property {string} start_time - Format: "HH:MM"
 * @property {string} end_time - Format: "HH:MM"
 * @property {string} created_at
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} coach_id
 * @property {string} student_name
 * @property {string} student_email
 * @property {string|null} student_phone
 * @property {string} booking_date - Format: "YYYY-MM-DD"
 * @property {string} start_time - Format: "HH:MM"
 * @property {string} end_time - Format: "HH:MM"
 * @property {'pending'|'confirmed'|'rejected'|'cancelled'} status
 * @property {string|null} notes
 * @property {string|null} course_type
 * @property {string} created_at
 * @property {string} updated_at
 */

/** @type {string[]} */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** @type {string[]} */
export const COURSE_TYPES = [
  'beginner',
  'intermediate',
  'expert',
]
