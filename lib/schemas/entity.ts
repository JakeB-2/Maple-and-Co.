import { z } from 'zod'

// Shared by the form (client) and the action (server) — one source of truth.

export const ENTITY_KINDS = ['pet', 'plant'] as const

// Pets and plants are one table with a kind discriminator (D-032) — the
// profile fields are identical, so one schema serves both.
export const entityInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  kind: z.enum(ENTITY_KINDS),
  photo_path: z.string().nullable(),
  birthday: z.iso.date().nullable(),
})

export type EntityInput = z.infer<typeof entityInputSchema>
