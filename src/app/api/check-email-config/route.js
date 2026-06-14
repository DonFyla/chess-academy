import { NextResponse } from 'next/server'

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY
  
  return NextResponse.json({
    configured: !!resendKey,
    keyPrefix: resendKey ? resendKey.substring(0, 6) + '...' : null,
    message: resendKey 
      ? 'Resend API key is configured' 
      : 'RESEND_API_KEY not found in environment variables'
  })
}
