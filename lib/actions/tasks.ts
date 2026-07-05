'use server'

// Server actions are public POST endpoints — requireAuth() gates every one.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { toDb } from '@/lib/recurrence/types'
import { taskInputSchema } from '@/lib/schemas/task'

export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  // The rule fans out into the 6 embedded recur_* columns (D-015); everything
  // else on the parsed shape maps straight to a column.
  const { recurrence, ...fields } = parsed.data

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...fields, ...toDb(recurrence), ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('tasks')
  return ok({ id: data.id })
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { recurrence, ...fields } = parsed.data

  const { error } = await supabase
    .from('tasks')
    .update({ ...fields, ...toDb(recurrence), ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('tasks')
  return ok({ id })
}
