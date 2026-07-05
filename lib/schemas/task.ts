import { z } from 'zod'
import { recurrenceInputSchema } from '@/lib/recurrence/types'

// Shared by the form (client) and the action (server) — one source of truth.

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Give it a title').max(120),
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    emoji: z.string().trim().min(1).max(8),
    anchor_on: z.iso.date(),
    recurrence: recurrenceInputSchema, // RecurrenceRule | null
    pet_id: z.uuid().nullable(),
    log_pet_event_type_id: z.uuid().nullable(),
  })
  // A Maple-log linkage is anchored to a pet — you can't log an event with no pet.
  .refine((v) => v.log_pet_event_type_id === null || v.pet_id !== null, {
    message: 'Linking a Maple log needs a pet',
    path: ['log_pet_event_type_id'],
  })

export type TaskInput = z.infer<typeof taskInputSchema>
