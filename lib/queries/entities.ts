// Read-side for household entities — pets and plants share one table with a
// `kind` discriminator (D-032: Needs generalization; modules stay separate in
// the UI, the data model does not).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type EntityKind = 'pet' | 'plant'

// The DB CHECK-constrains `kind` but codegen types it as string — narrow at
// the query boundary so the rest of the app switches on a closed union.
export type EntityRow = Omit<Database['public']['Tables']['entities']['Row'], 'kind'> & {
  kind: EntityKind
}

export async function fetchEntities(
  supabase: SupabaseClient<Database>,
  kind: EntityKind
): Promise<EntityRow[]> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .is('deleted_at', null)
    .eq('kind', kind)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as EntityRow[]
}

export async function fetchEntity(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<EntityRow | null> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as EntityRow | null
}
