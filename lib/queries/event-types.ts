// Read-side for the event-type catalog (EAV, D-013), shared by pets and
// plants via `entity_kind` (D-032). Cadence/show_on_today moved off the type
// config onto per-entity needs — type `config` no longer carries semantics we
// parse here. Attribute config stays free-form jsonb edited via settings —
// the parsers below are tolerant on purpose: bad or missing shapes degrade to
// [] instead of throwing.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EntityKind } from '@/lib/queries/entities'

// The DB CHECK-constrains `entity_kind` but codegen types it as string —
// narrow at the query boundary like EntityRow does.
export type EventTypeRow = Omit<Database['public']['Tables']['event_types']['Row'], 'entity_kind'> & {
  entity_kind: EntityKind
}
export type EventTypeAttributeRow = Database['public']['Tables']['event_type_attributes']['Row']

// `archived` options are dropped from the settings textarea + new-log pickers
// but stay in config forever so logged choice_ids still resolve their label
// (D-013: removing an option would orphan history).
export type ChoiceOption = { id: string; label: string; emoji?: string; archived?: boolean }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function attributeOptions(attr: Pick<EventTypeAttributeRow, 'config'>): ChoiceOption[] {
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
  attr: Pick<EventTypeAttributeRow, 'config'>
): ChoiceOption[] {
  return attributeOptions(attr).filter((option) => !option.archived)
}

/**
 * Append-only merge of an attribute's choice options on edit (D-013). Logged
 * choice_ids point at option ids, so an id is NEVER dropped:
 * - a kept id present in the payload takes the payload's label/emoji and is
 *   un-archived (re-typing a removed line brings it back);
 * - a kept id missing from the payload is archived (kept for history, hidden
 *   from new-log pickers);
 * - a brand-new id appends active.
 * Pure so the guarantee is unit-testable independent of the server action.
 */
export function mergeAttributeOptions(
  kept: ChoiceOption[],
  submitted: ChoiceOption[]
): ChoiceOption[] {
  const submittedById = new Map(submitted.map((option) => [option.id, option]))
  const keptIds = new Set(kept.map((option) => option.id))
  return [
    ...kept.map((option) => {
      const match = submittedById.get(option.id)
      return match ? { ...match, archived: false } : { ...option, archived: true }
    }),
    ...submitted.filter((option) => !keptIds.has(option.id)),
  ]
}

export async function fetchEventTypes(
  supabase: SupabaseClient<Database>,
  kind: EntityKind
): Promise<EventTypeRow[]> {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .is('deleted_at', null)
    .eq('entity_kind', kind)
    .order('sort_order')

  if (error) throw error
  return (data ?? []) as EventTypeRow[]
}

export async function fetchEventType(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<EventTypeRow | null> {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as EventTypeRow | null
}

export async function fetchAttributesForType(
  supabase: SupabaseClient<Database>,
  typeId: string
): Promise<EventTypeAttributeRow[]> {
  const { data, error } = await supabase
    .from('event_type_attributes')
    .select('*')
    .is('deleted_at', null)
    .eq('event_type_id', typeId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function fetchAllAttributes(
  supabase: SupabaseClient<Database>
): Promise<EventTypeAttributeRow[]> {
  const { data, error } = await supabase
    .from('event_type_attributes')
    .select('*')
    .is('deleted_at', null)
    .order('event_type_id')
    .order('sort_order')

  if (error) throw error
  return data ?? []
}
