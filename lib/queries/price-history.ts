// Read-side for grocery price observations. Prices are hard rows (no
// deleted_at) — there is no tombstone filter here.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const PRICE_OBSERVATION_SELECT = `
  id, grocery_item_id, store_id, price, observed_on, source, created_at,
  store:stores(id, name, emoji, currency)
` as const

export type PriceObservationRow = {
  id: string
  grocery_item_id: string
  store_id: string
  price: number
  observed_on: string
  source: 'checkoff' | 'manual' | 'receipt'
  created_at: string
  store: { id: string; name: string; emoji: string; currency: 'MXN' | 'USD' } | null
}

export async function fetchPriceHistory(
  supabase: SupabaseClient<Database>,
  itemId: string,
  limit = 12
): Promise<PriceObservationRow[]> {
  const { data, error } = await supabase
    .from('grocery_item_prices')
    .select(PRICE_OBSERVATION_SELECT)
    .eq('grocery_item_id', itemId)
    .order('observed_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as PriceObservationRow[]
}

export async function fetchStorePrices(
  supabase: SupabaseClient<Database>,
  storeId: string,
  itemIds: string[]
): Promise<PriceObservationRow[]> {
  if (itemIds.length === 0) return []

  const { data, error } = await supabase
    .from('grocery_item_prices')
    .select(PRICE_OBSERVATION_SELECT)
    .eq('store_id', storeId)
    .in('grocery_item_id', itemIds)

  if (error) throw error
  return (data ?? []) as unknown as PriceObservationRow[]
}

// Pure: newest observation per item by (observed_on, created_at) — makes no
// assumption about the input's sort order.
export function latestPriceByItem(
  observations: PriceObservationRow[]
): Map<string, PriceObservationRow> {
  const latest = new Map<string, PriceObservationRow>()
  for (const observation of observations) {
    const current = latest.get(observation.grocery_item_id)
    if (
      !current ||
      observation.observed_on > current.observed_on ||
      (observation.observed_on === current.observed_on &&
        observation.created_at > current.created_at)
    ) {
      latest.set(observation.grocery_item_id, observation)
    }
  }
  return latest
}
