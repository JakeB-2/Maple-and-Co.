import { requireAuth } from '@/lib/auth/dal'
import { ComingSoon } from '@/components/screens/coming-soon'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  await requireAuth()
  return <ComingSoon title="Calendar" milestone="M4" blurb="The household rhythm — events, chores, and gentle reminders." />
}
