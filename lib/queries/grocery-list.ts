// Read-side for the grocery list. Entries embed their catalog item as a plain
// left join (not !inner) — tombstoned items hide their entries in TS after the
// fetch, so restoring the item brings its entries straight back.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const GROCERY_ENTRY_SELECT = `
  id, grocery_item_id, qty, note,
  purchased_at, purchased_by_user_id, purchased_store_id, purchased_price,
  created_at, created_by_user_id,
  item:grocery_items(id, name, emoji, default_qty, deleted_at)
` as const

export type GroceryEntryItem = {
  id: string
  name: string
  emoji: string
  default_qty: string | null
  deleted_at: string | null
}

export type GroceryEntryRow = {
  id: string
  grocery_item_id: string
  qty: string | null
  note: string | null
  purchased_at: string | null
  purchased_by_user_id: string | null
  purchased_store_id: string | null
  purchased_price: number | null
  created_at: string
  created_by_user_id: string | null
  item: GroceryEntryItem
}

function withLiveItems(entries: GroceryEntryRow[]): GroceryEntryRow[] {
  return entries.filter((entry) => entry.item.deleted_at === null)
}

export async function fetchActiveEntries(
  supabase: SupabaseClient<Database>
): Promise<GroceryEntryRow[]> {
  const { data, error } = await supabase
    .from('grocery_list_entries')
    .select(GROCERY_ENTRY_SELECT)
    .is('deleted_at', null)
    .is('purchased_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return withLiveItems((data ?? []) as unknown as GroceryEntryRow[])
}

export async function fetchEntry(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<GroceryEntryRow | null> {
  const { data, error } = await supabase
    .from('grocery_list_entries')
    .select(GROCERY_ENTRY_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as GroceryEntryRow | null
}

export async function fetchTripEntries(
  supabase: SupabaseClient<Database>,
  storeId: string,
  dateYYYYMMDD: string
): Promise<GroceryEntryRow[]> {
  // Cancun is fixed UTC-5 with no DST (D-008), so the day boundary is a
  // constant offset — no timezone lib in the query layer.
  const { data, error } = await supabase
    .from('grocery_list_entries')
    .select(GROCERY_ENTRY_SELECT)
    .is('deleted_at', null)
    .eq('purchased_store_id', storeId)
    .gte('purchased_at', `${dateYYYYMMDD}T00:00:00-05:00`)
    .order('purchased_at', { ascending: false })

  if (error) throw error
  return withLiveItems((data ?? []) as unknown as GroceryEntryRow[])
}

export async function fetchRecentEntryItemRefs(
  supabase: SupabaseClient<Database>,
  limit = 120
): Promise<GroceryEntryRow[]> {
  const { data, error } = await supabase
    .from('grocery_list_entries')
    .select(GROCERY_ENTRY_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as GroceryEntryRow[]
}

// Pure: entries arrive recent-first, so first occurrence per item wins.
export function recentlyUsedItems(entries: GroceryEntryRow[], limit = 12): GroceryEntryItem[] {
  const seen = new Set<string>()
  const items: GroceryEntryItem[] = []
  for (const entry of entries) {
    if (entry.item.deleted_at !== null) continue
    if (seen.has(entry.item.id)) continue
    seen.add(entry.item.id)
    items.push(entry.item)
    if (items.length >= limit) break
  }
  return items
}

export async function fetchRecentPartnerGroceryAdds(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  limit = 5
): Promise<GroceryEntryRow[]> {
  const { data, error } = await supabase
    .from('grocery_list_entries')
    .select(GROCERY_ENTRY_SELECT)
    .is('deleted_at', null)
    .is('purchased_at', null)
    .neq('created_by_user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return withLiveItems((data ?? []) as unknown as GroceryEntryRow[])
}
