import { z } from 'zod'

// Shared by the form (client) and the action (server) — one source of truth.
export const petInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  birthday: z.iso.date().nullable(),
  photo_path: z.string().nullable(),
})

export type PetInput = z.infer<typeof petInputSchema>
