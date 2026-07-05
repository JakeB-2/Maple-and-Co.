import { z } from 'zod'

// Shared by forms (client) and actions (server) — one source of truth.

// One EAV value cell (D-013): only the column matching the attribute's
// value_kind is meaningful; the RPC stores whatever is present.
export const petEventValueInputSchema = z.object({
  attribute_id: z.uuid(),
  value_text: z.string().max(2000).nullish(),
  value_number: z.number().finite().nullish(),
  value_boolean: z.boolean().nullish(),
  choice_ids: z.array(z.string().max(60)).max(20).nullish(),
  file_path: z.string().nullish(),
})

export const logPetEventInputSchema = z.object({
  pet_id: z.uuid(),
  event_type_id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  // Actor-of-record: who did the thing (defaults to the current user in the
  // form; either member may log the other's walk).
  done_by_user_id: z.uuid(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  values: z.array(petEventValueInputSchema).max(30),
})

// Pet and type are fixed once logged — edit only moves the when/who/values.
// attribute_ids = the attributes the form rendered; the RPC clears only those
// values (so values of since-deleted attributes survive an edit).
export const updatePetEventInputSchema = logPetEventInputSchema
  .omit({ pet_id: true, event_type_id: true })
  .extend({ attribute_ids: z.array(z.uuid()).max(30) })

export type PetEventValueInput = z.infer<typeof petEventValueInputSchema>
export type LogPetEventInput = z.infer<typeof logPetEventInputSchema>
export type UpdatePetEventInput = z.infer<typeof updatePetEventInputSchema>
