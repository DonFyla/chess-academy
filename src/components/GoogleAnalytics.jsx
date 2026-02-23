'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

// Replace with your actual Google Analytics Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX'

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return
    
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    
    // Send pageview to Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      })
    }
  }, [pathname, searchParams])

  // Don't render if no GA ID is set
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true,
            transport_type: 'beacon',
            custom_map: {
              'custom_parameter_1': 'user_type',
              'custom_parameter_2': 'booking_status'
            }
          });
        `}
      </Script>
    </>
  )
}

// Helper function to track custom events
export function trackEvent(eventName, params = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...params,
      event_timestamp: new Date().toISOString(),
    })
  }
}

// Common events for the chess academy
export const events = {
  // Booking events
  bookingStarted: (coachName) => trackEvent('booking_started', { coach_name: coachName }),
  bookingSubmitted: (value) => trackEvent('booking_submitted', { value, currency: 'NGN' }),
  paymentConfirmed: (value) => trackEvent('payment_confirmed', { value, currency: 'NGN' }),
  
  // User events
  userSignedUp: (method) => trackEvent('sign_up', { method }),
  userLoggedIn: (method) => trackEvent('login', { method }),
  
  // Engagement events
  courseViewed: (courseName) => trackEvent('course_viewed', { course_name: courseName }),
  quizStarted: () => trackEvent('quiz_started'),
  quizCompleted: (score) => trackEvent('quiz_completed', { score }),
  
  // Coach events
  coachProfileViewed: (coachName) => trackEvent('coach_profile_viewed', { coach_name: coachName }),
  availabilityChecked: (coachName) => trackEvent('availability_checked', { coach_name: coachName }),
}
