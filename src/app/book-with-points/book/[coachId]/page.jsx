import { getPointsBookingMetadata } from "@/lib/metadata";
import { createClient } from '@supabase/supabase-js'
import PointsBookingClient from './PointsBookingClient';

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
      .select('name, is_special, points_cost, rank_title')
      .eq('id', coachId)
      .single()
    
    if (error || !coach) {
      return getPointsBookingMetadata('Coach')
    }
    
    return getPointsBookingMetadata(coach.name, coach.is_special, coach.points_cost, coach.rank_title)
  } catch (e) {
    return getPointsBookingMetadata('Coach')
  }
}

export default async function PointsBookingPage({ params }) {
  const resolvedParams = await params
  const coachId = resolvedParams.coachId
  
  return <PointsBookingClient coachId={coachId} />
}
