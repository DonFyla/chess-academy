import PointsBookingClient from '@/app/book-with-points/book/[coachId]/PointsBookingClient'

export const metadata = {
  title: 'Book Elite Coach with Points | Chess Academy',
  description: 'Book an elite coach using your points.',
}

export default async function BookEliteCoachPage({ params }) {
  const resolvedParams = await params
  const coachId = resolvedParams.coachId
  
  return <PointsBookingClient coachId={coachId} />
}
