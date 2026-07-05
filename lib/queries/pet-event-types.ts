// Read-side for the pet event-type catalog (EAV, D-013). Config columns are
// free-form jsonb edited via settings — the parsers below are tolerant on
// purpose: bad or missing shapes degrade to {} / [] instead of throwing.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type PetEventTypeRow = Database['public']['Tables']['pet_event_types']['Row']
export type PetEventAttributeRow = Database['public']['Tables']['pet_event_attributes']['Row']

export type RecencyConfig = { expect_every_hours?: number; warn_after_hours?: number }
export type PetEventTypeConfig = { recency?: RecencyConfig; show_on_today?: boolean }
// `archived` options are dropped from the settings textarea + new-log pickers
// but stay in config forever so logged choice_ids still resolve their label
// (D-013: removing an option would orphan history).
export type ChoiceOption = { id: string; label: string; emoji?: string; archived?: boolean }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function typeConfig(type: Pick<PetEventTypeRow, 'config'>): PetEventTypeConfig {
  const raw = asRecord(type.config)
  if (!raw) return {}

  const config: PetEventTypeConfig = {}
  const recencyRaw = asRecord(raw.recency)
  if (recencyRaw) {
    const recency: RecencyConfig = {}
    if (typeof recencyRaw.expect_every_hours === 'number' && Number.isFinite(recencyRaw.expect_every_hours)) {
      recency.expect_every_hours = recencyRaw.expect_every_hours
    }
    if (typeof recencyRaw.warn_after_hours === 'number' && Number.isFinite(recencyRaw.warn_after_hours)) {
      recency.warn_after_hours = recencyRaw.warn_after_hours
    }
    config.recency = recency
  }
  if (typeof raw.show_on_today === 'boolean') config.show_on_today = raw.show_on_today
  return config
}

export function attributeOptions(attr: Pick<PetEventAttributeRow, 'config'>): ChoiceOption[] {
  const raw = asRecord(attr.config)
  if (!raw || !Array.isArray(raw.options)) return []

  const options: ChoiceOption[] = []
  for (const entry of raw.options) {
    const option = asRecord(entry)
    if (!option) continue
    if (typeof option.id !== 'string' || typeof option.label !== 'string') continue
    options.push({
      id: option.id,
      label: option.label,
      ...(typeof option.emoji === 'string' ? { emoji: option.emoji } : {}),
      ...(option.archived === true ? { archived: true } : {}),
    })
  }
  return options
}

// The options a NEW log may pick from — archived ones are retired from the
// picker but still resolve in history/detail via attributeOptions().
export function selectableAttributeOptions(
  attr: Pick<PetEventAttributeRow, 'config'>
): ChoiceOption[] {
  return attributeOptions(attr).filter((option) => !option.archived)
}

export async function fetchPetEventTypes(
  supabase: SupabaseClient<Database>
): Promise<PetEventTypeRow[]> {
  const { data, error } = await supabase
    .from('pet_event_types')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function fetchPetEventType(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<PetEventTypeRow | null> {
  const { data, error } = await supabase
    .from('pet_event_types')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchAttributesForType(
  supabase: SupabaseClient<Database>,
  typeId: string
): Promise<PetEventAttributeRow[]> {
  const { data, error } = await supabase
    .from('pet_event_attributes')
    .select('*')
    .is('deleted_at', null)
    .eq('event_type_id', typeId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function fetchAllAttributes(
  supabase: SupabaseClient<Database>
): Promise<PetEventAttributeRow[]> {
  const { data, error } = await supabase
    .from('pet_event_attributes')
    .select('*')
    .is('deleted_at', null)
    .order('event_type_id')
    .order('sort_order')

  if (error) throw error
  return data ?? []
}
