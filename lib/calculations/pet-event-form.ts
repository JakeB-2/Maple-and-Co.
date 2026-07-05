// Pure form <-> EAV mapping for pet events (D-013): the one generic quick-log
// form is built from a type's attribute rows, keyed by attribute id. No
// supabase or server imports — unit-tested directly.

import { z } from 'zod'
import type { PetEventAttributeRow } from '@/lib/queries/pet-event-types'
import type { PetEventValueRow } from '@/lib/queries/pet-events'

export type EventValueInput = {
  attribute_id: string
  value_text?: string | null
  value_number?: number | null
  value_boolean?: boolean | null
  choice_ids?: string[] | null
  file_path?: string | null
}

// choice_ids is jsonb — tolerate anything that isn't a string array.
function choiceIds(value: PetEventValueRow | undefined): string[] {
  if (!value || !Array.isArray(value.choice_ids)) return []
  return value.choice_ids.filter((id): id is string => typeof id === 'string')
}

function attributeSchema(attr: PetEventAttributeRow): z.ZodType<unknown> {
  switch (attr.value_kind) {
    case 'text':
    case 'long_text': {
      const base = z.string().trim().max(2000)
      return attr.required ? base.min(1, `${attr.label} is required`) : base
    }
    case 'number':
      // NumberField emits NaN (valueAsNumber) or null (nullable) when empty;
      // normalize the empties to null so required-ness is a single rule.
      return z.preprocess(
        (v) => (v === '' || v == null ? null : Number(v)),
        attr.required
          ? z.number({ error: `${attr.label} is required` }).finite()
          : z.number().finite().nullable(),
      )
    case 'boolean':
      return z.boolean().default(false)
    case 'single_choice': {
      const base = z.string()
      return attr.required ? base.min(1, `${attr.label} is required`) : base
    }
    case 'photo': {
      // Storage path set by the upload flow; '' = none.
      const base = z.string()
      return attr.required ? base.min(1, 'Add a photo') : base
    }
    case 'multi_choice':
      return attr.required
        ? z.array(z.string()).min(1, `${attr.label} is required`)
        : z.array(z.string()).default([])
    default:
      // Unknown kind (schema drift): accept anything rather than brick the form.
      return z.unknown()
  }
}

/** Form schema keyed by attribute id — caller passes live attributes only. */
export function buildEventFormSchema(
  attributes: PetEventAttributeRow[],
): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType<unknown>> = {}
  for (const attr of attributes) shape[attr.id] = attributeSchema(attr)
  return z.object(shape) as unknown as z.ZodType<Record<string, unknown>>
}

/** RHF defaults — '' / false / [] for blanks so every input stays controlled. */
export function eventFormDefaults(
  attributes: PetEventAttributeRow[],
  existing?: PetEventValueRow[],
): Record<string, unknown> {
  const byAttribute = new Map((existing ?? []).map((value) => [value.attribute_id, value]))
  const defaults: Record<string, unknown> = {}
  for (const attr of attributes) {
    const value = byAttribute.get(attr.id)
    switch (attr.value_kind) {
      case 'number':
        defaults[attr.id] = value?.value_number ?? ''
        break
      case 'boolean':
        defaults[attr.id] = value?.value_boolean ?? false
        break
      case 'single_choice':
        defaults[attr.id] = choiceIds(value)[0] ?? ''
        break
      case 'multi_choice':
        defaults[attr.id] = choiceIds(value)
        break
      case 'photo':
        defaults[attr.id] = value?.file_path ?? ''
        break
      default:
        // text / long_text (and unknown kinds degrade to a text default)
        defaults[attr.id] = value?.value_text ?? ''
    }
  }
  return defaults
}

/** Parsed form values -> RPC value rows; empty ('' / null / []) are skipped. */
export function formValuesToEventValues(
  attributes: PetEventAttributeRow[],
  values: Record<string, unknown>,
): EventValueInput[] {
  const out: EventValueInput[] = []
  for (const attr of attributes) {
    const value = values[attr.id]
    switch (attr.value_kind) {
      case 'text':
      case 'long_text': {
        if (typeof value === 'string' && value.trim() !== '') {
          out.push({ attribute_id: attr.id, value_text: value.trim() })
        }
        break
      }
      case 'number': {
        if (typeof value === 'number' && Number.isFinite(value)) {
          out.push({ attribute_id: attr.id, value_number: value })
        }
        break
      }
      case 'boolean': {
        // An unchecked box means "not logged", not "logged as no".
        if (value === true) out.push({ attribute_id: attr.id, value_boolean: true })
        break
      }
      case 'single_choice': {
        if (typeof value === 'string' && value !== '') {
          out.push({ attribute_id: attr.id, choice_ids: [value] })
        }
        break
      }
      case 'multi_choice': {
        if (Array.isArray(value) && value.length > 0) {
          const ids = value.filter((id): id is string => typeof id === 'string')
          if (ids.length > 0) out.push({ attribute_id: attr.id, choice_ids: ids })
        }
        break
      }
      case 'photo': {
        if (typeof value === 'string' && value !== '') {
          out.push({ attribute_id: attr.id, file_path: value })
        }
        break
      }
    }
  }
  return out
}
