// Simple middleware - just pass through for now
// Auth is handled in page components
import { NextResponse } from 'next/server'

export function middleware(req) {
  return NextResponse.next()
}

export const config = {
  matcher: []
}
