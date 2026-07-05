import { z } from 'zod'
import { CURRENCIES } from '@/lib/config'

// Shared by the form (client) and the action (server) — one source of truth.
export const spendInputSchema = z.object({
  amount: z.coerce.number().positive('Amount must be more than zero').multipleOf(0.01),
  currency: z.enum(CURRENCIES),
  spent_on: z.iso.date(),
  category_id: z.uuid().nullable(),
  // Actor-of-record: whose spend this was (defaults to the current user in
  // the form; either member may log the other's cash spend).
  spent_by_user_id: z.uuid(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  photo_path: z.string().nullable(),
})

export type SpendInput = z.infer<typeof spendInputSchema>
