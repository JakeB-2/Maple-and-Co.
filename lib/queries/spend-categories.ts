import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type SpendCategoryRow = Database['public']['Tables']['spend_categories']['Row']

export async function fetchSpendCategories(
  supabase: SupabaseClient<Database>
): Promise<SpendCategoryRow[]> {
  const { data, error } = await supabase
    .from('spend_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}
