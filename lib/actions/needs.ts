'use server'

// Needs pair an entity with an event type and carry the cadence (D-032).
// Last-fulfilled is always derived from entity_events — never written here —
// so quick-log and task completion can't disagree. Delete rides the generic
// softDelete whitelist.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { needInputSchema } from '@/lib/schemas/need'

export async function createNeed(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = needInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('needs')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) {
    // Two phones adding the same need at once (or a stale form): the live
    // UNIQUE (entity_id, event_type_id) rejects the loser — friendly message,
    // not a raw constraint error.
    if (error.code === '23505') {
      return fail('That need already exists for this pet/plant.')
    }
    return fail(sanitizeActionError(error))
  }
  revalidateTable('needs')
  return ok({ id: data.id })
}

export async function updateNeed(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = needInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('needs')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    // Re-pointing a need at a pair that already has one hits the same UNIQUE.
    if (error.code === '23505') {
      return fail('That need already exists for this pet/plant.')
    }
    return fail(sanitizeActionError(error))
  }
  revalidateTable('needs')
  return ok({ id })
}
