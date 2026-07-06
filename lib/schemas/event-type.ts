import { z } from 'zod'

// Shared by forms (client) and actions (server) — one source of truth.

// Types are just name + emoji + order now — cadence/show_on_today moved to
// needs (D-032): a type describes WHAT happened, a need says how often a
// specific pet/plant expects it.
export const eventTypeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  sort_order: z.coerce.number().int(),
})

// entity_kind is create-only: a type belongs to the pets or plants catalog
// for good — events logged against it would strand on a kind flip.
export const createEventTypeInputSchema = eventTypeInputSchema.extend({
  entity_kind: z.enum(['pet', 'plant']),
})

export type EventTypeInput = z.infer<typeof eventTypeInputSchema>
export type CreateEventTypeInput = z.infer<typeof createEventTypeInputSchema>

export const VALUE_KINDS = [
  'text',
  'long_text',
  'number',
  'boolean',
  'single_choice',
  'multi_choice',
  'photo',
] as const

export const eventTypeAttributeInputSchema = z.object({
  event_type_id: z.uuid(),
  label: z.string().trim().min(1, 'Label is required').max(60),
  value_kind: z.enum(VALUE_KINDS),
  unit: z
    .string()
    .trim()
    .max(12)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  required: z.boolean(),
  sort_order: z.coerce.number().int(),
  // Choice kinds only. Option ids are identity — logged choice_ids point at
  // them — so the update action merges append-only (D-013).
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().trim().min(1, 'Label is required').max(60),
        emoji: z.string().max(8).optional(),
      })
    )
    .max(30)
    .optional(),
})

export type EventTypeAttributeInput = z.infer<typeof eventTypeAttributeInputSchema>
