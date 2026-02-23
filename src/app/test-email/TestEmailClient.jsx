'use client'

import { useState, useEffect } from 'react'

export default function TestEmailClient() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [configStatus, setConfigStatus] = useState(null)

  useEffect(() => {
    // Check email configuration on load
    fetch('/api/check-email-config')
      .then(res => res.json())
      .then(data => setConfigStatus(data))
      .catch(() => setConfigStatus({ configured: false, message: 'Failed to check config' }))
  }, [])

  const sendTestEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')

    // Test booking data
    const testBooking = {
      student_name: 'Test Student',
      student_email: email,
      coach_name: 'Coach Akintoye',
      booking_date: '2026-02-20',
      start_time: '10:00',
      end_time: '11:00',
      course_type: 'beginner',
      status: 'confirmed'
    }

    try {
      const res = await fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: testBooking })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('✅ Email sent successfully! Check your inbox.')
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to send email'}`)
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#5E5044]">Test Email</h1>
          <p className="text-gray-600 mt-2">Send a test booking confirmation email</p>
        </div>

        {/* Configuration Status */}
        <div className="mb-6 bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Email Configuration</h3>
          {configStatus === null ? (
            <p className="text-sm text-gray-500">Checking configuration...</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={configStatus.configured ? 'text-green-600 text-xl' : 'text-red-600 text-xl'}>
                  {configStatus.configured ? '✅' : '❌'}
                </span>
                <span className={configStatus.configured ? 'text-green-700' : 'text-red-700'}>
                  {configStatus.message}
                </span>
              </div>
              {configStatus.keyPrefix && (
                <p className="text-gray-500 text-xs">Key: {configStatus.keyPrefix}</p>
              )}
              {!configStatus.configured && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  <p className="font-medium">To configure:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to https://resend.com and sign up</li>
                    <li>Get your API key</li>
                    <li>Add to .env.local: RESEND_API_KEY=re_xxxx</li>
                    <li>Restart the server</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {status && (
            <div className={`mb-4 p-4 rounded-lg text-sm ${
              status.includes('✅') 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {status}
            </div>
          )}

          <form onSubmit={sendTestEmail} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5E5044] focus:border-[#5E5044] outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-2">This will send a test email with:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Coach: Coach Akintoye</li>
                <li>Date: February 20, 2026</li>
                <li>Time: 10:00 AM - 11:00 AM</li>
                <li>Status: Confirmed</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !configStatus?.configured}
              className="w-full py-3 px-4 bg-[#5E5044] text-white font-medium rounded-lg hover:bg-[#4a3f35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a href="/" className="text-gray-500 hover:text-[#5E5044] transition-colors">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
