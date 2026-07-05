import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export async function fetchProfiles(supabase: SupabaseClient<Database>): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('display_name')

  if (error) throw error
  return data ?? []
}
