import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type StoreRow = Database['public']['Tables']['stores']['Row']
export type StoreSectionRow = Database['public']['Tables']['store_sections']['Row']
export type StorePlacementRow = { grocery_item_id: string; section_id: string }

export async function fetchStores(supabase: SupabaseClient<Database>): Promise<StoreRow[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function fetchStore(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<StoreRow | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchStoreSections(
  supabase: SupabaseClient<Database>,
  storeId: string
): Promise<StoreSectionRow[]> {
  const { data, error } = await supabase
    .from('store_sections')
    .select('*')
    .is('deleted_at', null)
    .eq('store_id', storeId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

// Placements are hard rows (no deleted_at) — an item is either placed or not.
export async function fetchStorePlacements(
  supabase: SupabaseClient<Database>,
  storeId: string
): Promise<StorePlacementRow[]> {
  const { data, error } = await supabase
    .from('grocery_item_placements')
    .select('grocery_item_id, section_id')
    .eq('store_id', storeId)

  if (error) throw error
  return data ?? []
}
