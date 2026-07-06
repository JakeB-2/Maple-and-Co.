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
    need_id: z.uuid().nullable(),
    entity_label: z
      .string()
      .trim()
      .max(60)
      .transform((v) => (v === '' ? null : v))
      .nullable(),
  })
  // Mutually exclusive (mirrors the DB CHECK, D-032): a task either links a
  // need or carries a free-text label — the board chip has exactly one source.
  .refine((v) => v.need_id === null || v.entity_label === null, {
    message: 'Pick a need or a label, not both',
    path: ['entity_label'],
  })

export type TaskInput = z.infer<typeof taskInputSchema>
