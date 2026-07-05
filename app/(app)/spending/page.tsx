import { requireAuth } from '@/lib/auth/dal'
import { ComingSoon } from '@/components/screens/coming-soon'

export const dynamic = 'force-dynamic'

export default async function SpendingPage() {
  await requireAuth()
  return <ComingSoon title="Spend" milestone="M1" blurb="The shared spending diary — who bought what, in pesos and dollars." />
}
