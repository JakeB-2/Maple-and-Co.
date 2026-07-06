// Read-side for needs — per-entity cadence rows (D-032). A need's
// last-fulfilled is ALWAYS derived from entity_events, never stored here, so
// quick-log and task completion can't disagree. NULL expect_every_hours means
// track-last-done-only (its schedule may live on a linked task — the Meds
// pattern, D-026).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EntityKind } from '@/lib/queries/entities'

export type NeedRow = Database['public']['Tables']['needs']['Row']
export type NeedTypeRef = { id: string; name: string; emoji: string; system_key: string | null }
export type NeedWithType = NeedRow & { event_type: NeedTypeRef }
export type NeedWithEntity = NeedWithType & {
  entity: { id: string; name: string; kind: EntityKind }
}

const NEED_SELECT = `
  *,
  event_type:event_types(id, name, emoji, system_key)
` as const

export async function fetchNeedsForEntity(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<NeedWithType[]> {
  const { data, error } = await supabase
    .from('needs')
    .select(NEED_SELECT)
    .is('deleted_at', null)
    .eq('entity_id', entityId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []) as unknown as NeedWithType[]
}

// Every live need across all entities — Today's board and the task form both
// need the owning entity for grouping/labels, so this embeds it too.
export async function fetchAllNeeds(
  supabase: SupabaseClient<Database>
): Promise<NeedWithEntity[]> {
  const { data, error } = await supabase
    .from('needs')
    .select(`${NEED_SELECT}, entity:entities(id, name, kind)`)
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw error
  return (data ?? []) as unknown as NeedWithEntity[]
}
