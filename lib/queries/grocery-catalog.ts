import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type GroceryItemRow = Database['public']['Tables']['grocery_items']['Row']

export async function fetchGroceryItems(
  supabase: SupabaseClient<Database>
): Promise<GroceryItemRow[]> {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function fetchGroceryItem(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<GroceryItemRow | null> {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}
