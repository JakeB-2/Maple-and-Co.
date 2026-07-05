import { requireAuth } from '@/lib/auth/dal'
import { ComingSoon } from '@/components/screens/coming-soon'

export const dynamic = 'force-dynamic'

export default async function GroceriesPage() {
  await requireAuth()
  return <ComingSoon title="Groceries" milestone="M2" blurb="Build the list at home, shop it aisle by aisle." />
}
