import { createClient } from '@supabase/supabase-js'
import { getCoachBookingMetadata } from '@/lib/metadata'
import BookCoachClient from './BookCoachClient'

// Initialize Supabase admin client for server-side data fetching
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function generateMetadata({ params }) {
  // In Next.js 15, params is a Promise that needs to be awaited
  const { coachId } = await params
  
  try {
    const { data: coach, error } = await supabaseAdmin
      .from('coaches')
      .select('name, specialization, bio')
      .eq('id', coachId)
      .single()
    
    if (error || !coach) {
      return getCoachBookingMetadata('Coach')
    }
    
    return getCoachBookingMetadata(coach.name, coach.specialization, coach.bio)
  } catch (e) {
    return getCoachBookingMetadata('Coach')
  }
}

export default function BookCoachPage({ params }) {
  // Page component receives params synchronously
  return <BookCoachClient coachId={params.coachId} />
}
