import { z } from 'zod'

// Shared by the form (client) and the action (server) — one source of truth.

// A need = (entity, event type) + cadence (D-032). NULL expect_every_hours
// means track-last-done-only — the schedule may live on a linked task instead
// (the Meds pattern, D-026). Last-fulfilled is always derived from
// entity_events, never stored here.
export const needInputSchema = z
  .object({
    entity_id: z.uuid(),
    event_type_id: z.uuid(),
    expect_every_hours: z.coerce.number().positive().nullable(),
    warn_after_hours: z.coerce.number().positive().nullable(),
    show_on_today: z.boolean(),
    sort_order: z.coerce.number().int(),
  })
  .refine((v) => v.warn_after_hours === null || v.expect_every_hours !== null, {
    message: 'Warn-after needs an expected cadence first',
    path: ['warn_after_hours'],
  })

export type NeedInput = z.infer<typeof needInputSchema>
