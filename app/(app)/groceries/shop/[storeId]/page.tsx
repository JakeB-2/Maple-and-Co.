import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchStore, fetchStorePlacements, fetchStoreSections } from '@/lib/queries/stores'
import { fetchActiveEntries, fetchTripEntries } from '@/lib/queries/grocery-list'
import { fetchStorePrices, latestPriceByItem } from '@/lib/queries/price-history'
import { fetchProfiles } from '@/lib/queries/profiles'
import { ShoppingMode } from '@/components/groceries/shopping-mode'

export const dynamic = 'force-dynamic'

export default async function ShopPage({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  const { storeId: rawStoreId } = await params
  const storeId = sanitizeUuidParam(rawStoreId)
  if (!storeId) notFound()

  const { user, supabase } = await requireAuth()

  const store = await fetchStore(supabase, storeId)
  if (!store) notFound()

  const today = todayInTimeZone(HOUSEHOLD_TZ)

  const [sections, placements, activeEntries, tripEntries, profiles] = await Promise.all([
    fetchStoreSections(supabase, storeId),
    fetchStorePlacements(supabase, storeId),
    fetchActiveEntries(supabase),
    fetchTripEntries(supabase, storeId, today),
    fetchProfiles(supabase),
  ])

  const itemIds = [...new Set(activeEntries.map((entry) => entry.grocery_item_id))]
  const prices = await fetchStorePrices(supabase, storeId, itemIds)
  const lastPriceByItem: Record<string, number> = {}
  for (const [itemId, observation] of latestPriceByItem(prices)) {
    lastPriceByItem[itemId] = observation.price
  }

  return (
    <ShoppingMode
      store={store}
      sections={sections}
      placements={placements}
      activeEntries={activeEntries}
      tripEntries={tripEntries}
      lastPriceByItem={lastPriceByItem}
      profiles={profiles.map(({ id, display_name, signature_color }) => ({
        id,
        display_name,
        signature_color,
      }))}
      currentUserId={user.id}
    />
  )
}
