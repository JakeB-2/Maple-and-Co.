import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type PetRow = Database['public']['Tables']['pets']['Row']

// Single-pet household for now: the primary pet is the oldest live row.
export async function fetchPrimaryPet(supabase: SupabaseClient<Database>): Promise<PetRow | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
