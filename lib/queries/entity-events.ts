// Read-side for entity events (EAV, D-013; pets + plants share the table via
// entities.kind, D-032). Events embed their type plus the full value set;
// analytics anchor on attribute system_key, never names. The type embed no
// longer carries config — cadence lives on needs now (D-032).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const ENTITY_EVENT_SELECT = `
  id, entity_id, event_type_id, occurred_at, done_by_user_id, note,
  created_at, created_by_user_id,
  event_type:event_types(id, name, emoji, system_key),
  values:entity_event_values(id, attribute_id, value_text, value_number, value_boolean, choice_ids, file_path)
` as const

export type EntityEventValueRow = {
  id: string
  attribute_id: string
  value_text: string | null
  value_number: number | null
  value_boolean: boolean | null
  choice_ids: unknown
  file_path: string | null
}

export type EntityEventRow = {
  id: string
  entity_id: string
  event_type_id: string
  occurred_at: string
  done_by_user_id: string
  note: string | null
  created_at: string
  created_by_user_id: string | null
  event_type: { id: string; name: string; emoji: string; system_key: string | null }
  values: EntityEventValueRow[]
}

export async function fetchEntityEvents(
  supabase: SupabaseClient<Database>,
  entityId: string,
  limit = 60
): Promise<EntityEventRow[]> {
  const { data, error } = await supabase
    .from('entity_events')
    .select(ENTITY_EVENT_SELECT)
    .is('deleted_at', null)
    .eq('entity_id', entityId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as EntityEventRow[]
}

// Newest event PER type (not the newest 60 overall) — the recency chips and
// the needs last-done lines must not lose an infrequent type behind a wall of
// daily feed/walk logs. Rides the (event_type_id, occurred_at DESC) index.
export async function fetchLatestEventPerType(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('fn_latest_entity_events_per_type', {
    p_entity_id: entityId,
  })

  if (error) throw error
  return new Map((data ?? []).map((row) => [row.event_type_id, row.occurred_at]))
}

export async function fetchEntityEvent(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<EntityEventRow | null> {
  const { data, error } = await supabase
    .from('entity_events')
    .select(ENTITY_EVENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as EntityEventRow | null
}

type WeightValueRow = {
  value_number: number | null
  event: { occurred_at: string; entity_id: string; deleted_at: string | null }
}

export async function fetchWeightSeries(
  supabase: SupabaseClient<Database>,
  entityId: string,
  limit = 40
): Promise<{ occurred_at: string; kg: number }[]> {
  // Anchor on the system_key, not the attribute's (renameable) label.
  const { data: attribute, error: attributeError } = await supabase
    .from('event_type_attributes')
    .select('id')
    .eq('system_key', 'weight_kg')
    .is('deleted_at', null)
    .maybeSingle()

  if (attributeError) throw attributeError
  if (!attribute) return []

  // !inner makes the embedded .eq/.is filters drop non-matching value rows;
  // ordering by the to-one embed keeps the newest `limit` server-side.
  const { data, error } = await supabase
    .from('entity_event_values')
    .select('value_number, event:entity_events!inner(occurred_at, entity_id, deleted_at)')
    .eq('attribute_id', attribute.id)
    .eq('event.entity_id', entityId)
    .is('event.deleted_at', null)
    .order('event(occurred_at)', { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (data ?? []) as unknown as WeightValueRow[]
  return rows
    .filter(
      (row) =>
        row.event.entity_id === entityId &&
        row.event.deleted_at === null &&
        row.value_number !== null &&
        row.value_number > 0
    )
    .map((row) => ({ occurred_at: row.event.occurred_at, kg: row.value_number as number }))
    .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0))
}
