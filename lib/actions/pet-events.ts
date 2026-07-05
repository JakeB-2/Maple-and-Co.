'use server'

// Log writes go through atomic RPCs (D-021): the event row and its EAV value
// rows commit or fail together.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import type { Json } from '@/lib/database.types'
import { logPetEventInputSchema, updatePetEventInputSchema } from '@/lib/schemas/pet-event'

export async function logPetEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = logPetEventInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase.rpc('fn_log_pet_event', {
    p_pet_id: parsed.data.pet_id,
    p_event_type_id: parsed.data.event_type_id,
    p_occurred_at: parsed.data.occurred_at,
    p_done_by_user_id: parsed.data.done_by_user_id,
    // Nullable in SQL; typegen types args as required.
    p_note: parsed.data.note as string,
    p_values: parsed.data.values as unknown as Json,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('pet_events')
  revalidateTable('pet_event_values')
  return ok({ id: data })
}

export async function updatePetEvent(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = updatePetEventInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase.rpc('fn_update_pet_event', {
    p_event_id: id,
    p_occurred_at: parsed.data.occurred_at,
    p_done_by_user_id: parsed.data.done_by_user_id,
    // Nullable in SQL; typegen types args as required.
    p_note: parsed.data.note as string,
    p_values: parsed.data.values as unknown as Json,
    p_attribute_ids: parsed.data.attribute_ids,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  if (!data) return fail('That log is gone.')

  revalidateTable('pet_events')
  revalidateTable('pet_event_values')
  return ok({ id })
}
