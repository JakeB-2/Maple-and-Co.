import { z } from 'zod'

// Shared by the form (client) and the action (server) — one source of truth.

// The household_settings singleton (id=true): app identity only — title in
// the header/metadata plus an optional household photo.
export const householdSettingsInputSchema = z.object({
  app_title: z.string().trim().min(1, 'Title is required').max(40),
  photo_path: z.string().nullable(),
})

export type HouseholdSettingsInput = z.infer<typeof householdSettingsInputSchema>
