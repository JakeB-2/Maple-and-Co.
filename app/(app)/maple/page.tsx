import { requireAuth } from '@/lib/auth/dal'
import { ComingSoon } from '@/components/screens/coming-soon'

export const dynamic = 'force-dynamic'

export default async function MaplePage() {
  await requireAuth()
  return <ComingSoon title="Maple" milestone="M3" blurb="Walks, meals, meds, weight — and who did what, when." />
}
