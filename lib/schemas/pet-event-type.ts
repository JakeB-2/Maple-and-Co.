import { z } from 'zod'

// Shared by forms (client) and actions (server) — one source of truth.

// Flat form fields — the actions compose show_on_today/expect_every_hours/
// warn_after_hours into the config jsonb.
export const petEventTypeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  sort_order: z.coerce.number().int(),
  show_on_today: z.boolean(),
  expect_every_hours: z.coerce.number().positive().nullable(),
  warn_after_hours: z.coerce.number().positive().nullable(),
})

export type PetEventTypeInput = z.infer<typeof petEventTypeInputSchema>

export const VALUE_KINDS = [
  'text',
  'long_text',
  'number',
  'boolean',
  'single_choice',
  'multi_choice',
  'photo',
] as const

export const petEventAttributeInputSchema = z.object({
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

export type PetEventAttributeInput = z.infer<typeof petEventAttributeInputSchema>
