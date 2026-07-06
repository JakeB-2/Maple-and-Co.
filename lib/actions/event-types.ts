'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { createEventTypeInputSchema, eventTypeInputSchema } from '@/lib/schemas/event-type'

// Cadence/show_on_today moved off types onto needs (D-032), so config is no
// longer composed here — it's written empty on create and left untouched on
// update. system_key is never written here — analytics anchor on seeded
// types, seed-owned (D-013).

// entity_kind is create-only: it pins the type to the pets or plants catalog.
export async function createEventType(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = createEventTypeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('event_types')
    .insert({ ...parsed.data, config: {}, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('event_types')
  return ok({ id: data.id })
}

export async function updateEventType(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = eventTypeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  // config deliberately absent from the payload — whatever is stored survives.
  const { error } = await supabase
    .from('event_types')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('event_types')
  return ok({ id })
}
