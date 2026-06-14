import { getSpecialCoachBookingMetadata } from "@/lib/metadata";
import { createClient } from '@supabase/supabase-js'
import SpecialBookingClient from './SpecialBookingClient';

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
  const resolvedParams = await params
  const coachId = resolvedParams.coachId
  
  try {
    const { data: coach, error } = await supabaseAdmin
      .from('coaches')
      .select('name, rank_title, hourly_rate')
      .eq('id', coachId)
      .eq('is_special', true)
      .single()
    
    if (error || !coach) {
      return getSpecialCoachBookingMetadata('Elite Coach')
    }
    
    return getSpecialCoachBookingMetadata(coach.name, coach.rank_title, coach.hourly_rate)
  } catch (e) {
    return getSpecialCoachBookingMetadata('Elite Coach')
  }
}

export default async function SpecialBookingPage({ params }) {
  const resolvedParams = await params
  const coachId = resolvedParams.coachId
  
  return <SpecialBookingClient coachId={coachId} />
}
