// Read-side for the household_settings singleton (id=true row). The app must
// render before the row exists (fresh install), so a missing row degrades to
// the built-in brand defaults instead of throwing.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { APP_NAME } from '@/lib/config'

export type HouseholdSettings = { app_title: string; photo_path: string | null }

export async function fetchHouseholdSettings(
  supabase: SupabaseClient<Database>
): Promise<HouseholdSettings> {
  const { data, error } = await supabase
    .from('household_settings')
    .select('app_title, photo_path')
    .eq('id', true)
    .maybeSingle()

  if (error) throw error
  return data ?? { app_title: APP_NAME, photo_path: null }
}
