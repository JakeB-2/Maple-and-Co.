import { requireAuth } from '@/lib/auth/dal'
import { ComingSoon } from '@/components/screens/coming-soon'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requireAuth()
  return <ComingSoon title="Settings" milestone="M1–M4 (grows per feature)" blurb="Profiles & colors, categories, stores, and Maple's event types." />
}
