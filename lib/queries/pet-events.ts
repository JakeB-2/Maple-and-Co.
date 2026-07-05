// Read-side for pet events (EAV, D-013). Events embed their type plus the
// full value set; analytics anchor on attribute system_key, never names.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const PET_EVENT_SELECT = `
  id, pet_id, event_type_id, occurred_at, done_by_user_id, note,
  created_at, created_by_user_id,
  event_type:pet_event_types(id, name, emoji, system_key, config),
  values:pet_event_values(id, attribute_id, value_text, value_number, value_boolean, choice_ids, file_path)
` as const

export type PetEventValueRow = {
  id: string
  attribute_id: string
  value_text: string | null
  value_number: number | null
  value_boolean: boolean | null
  choice_ids: unknown
  file_path: string | null
}

export type PetEventRow = {
  id: string
  pet_id: string
  event_type_id: string
  occurred_at: string
  done_by_user_id: string
  note: string | null
  created_at: string
  created_by_user_id: string | null
  event_type: { id: string; name: string; emoji: string; system_key: string | null; config: unknown }
  values: PetEventValueRow[]
}

export async function fetchPetEvents(
  supabase: SupabaseClient<Database>,
  petId: string,
  limit = 60
): Promise<PetEventRow[]> {
  const { data, error } = await supabase
    .from('pet_events')
    .select(PET_EVENT_SELECT)
    .is('deleted_at', null)
    .eq('pet_id', petId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as PetEventRow[]
}

// Newest event PER type (not the newest 60 overall) — the recency chips and
// the meds last-done line must not lose an infrequent type behind a wall of
// daily feed/walk logs. Rides the (event_type_id, occurred_at DESC) index.
export async function fetchLatestEventPerType(
  supabase: SupabaseClient<Database>,
  petId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('fn_latest_pet_events_per_type', {
    p_pet_id: petId,
  })

  if (error) throw error
  return new Map((data ?? []).map((row) => [row.event_type_id, row.occurred_at]))
}

export async function fetchPetEvent(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<PetEventRow | null> {
  const { data, error } = await supabase
    .from('pet_events')
    .select(PET_EVENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as PetEventRow | null
}

type WeightValueRow = {
  value_number: number | null
  event: { occurred_at: string; pet_id: string; deleted_at: string | null }
}

export async function fetchWeightSeries(
  supabase: SupabaseClient<Database>,
  petId: string,
  limit = 40
): Promise<{ occurred_at: string; kg: number }[]> {
  // Anchor on the system_key, not the attribute's (renameable) label.
  const { data: attribute, error: attributeError } = await supabase
    .from('pet_event_attributes')
    .select('id')
    .eq('system_key', 'weight_kg')
    .is('deleted_at', null)
    .maybeSingle()

  if (attributeError) throw attributeError
  if (!attribute) return []

  // !inner makes the embedded .eq/.is filters drop non-matching value rows;
  // ordering by the to-one embed keeps the newest `limit` server-side.
  const { data, error } = await supabase
    .from('pet_event_values')
    .select('value_number, event:pet_events!inner(occurred_at, pet_id, deleted_at)')
    .eq('attribute_id', attribute.id)
    .eq('event.pet_id', petId)
    .is('event.deleted_at', null)
    .order('event(occurred_at)', { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (data ?? []) as unknown as WeightValueRow[]
  return rows
    .filter(
      (row) =>
        row.event.pet_id === petId &&
        row.event.deleted_at === null &&
        row.value_number !== null &&
        row.value_number > 0
    )
    .map((row) => ({ occurred_at: row.event.occurred_at, kg: row.value_number as number }))
    .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0))
}
