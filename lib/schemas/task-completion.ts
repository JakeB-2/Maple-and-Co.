import { z } from 'zod'

// Shared by the form (client) and the action (server) — one source of truth.

export const completeTaskInputSchema = z.object({
  task_id: z.uuid(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null),
})

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>
