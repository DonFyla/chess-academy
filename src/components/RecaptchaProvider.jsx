'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

export default function RecaptchaProvider({ children }) {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  
  // If no key is set, just render children without reCAPTCHA
  if (!recaptchaKey) {
    console.warn('reCAPTCHA site key not configured')
    return children
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  )
}
