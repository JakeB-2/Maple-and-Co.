'use server'

// Server actions are public POST endpoints — requireAuth() gates every one.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import {
  getCreateAuditFields,
  getUpdateAuditFields,
  getDeleteAuditFields,
  getRestoreAuditFields,
} from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { spendInputSchema } from '@/lib/schemas/spend'

export async function createSpend(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('spends')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id: data.id })
}

export async function updateSpend(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('spends')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}

export async function softDeleteSpend(id: string): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const { error } = await supabase
    .from('spends')
    .update(getDeleteAuditFields(user.id))
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}

export async function restoreSpend(id: string): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const { error } = await supabase
    .from('spends')
    .update(getRestoreAuditFields(user.id))
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spends')
  return ok({ id })
}
