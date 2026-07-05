'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import {
  getCreateAuditFields,
  getUpdateAuditFields,
  getDeleteAuditFields,
} from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { spendCategoryInputSchema } from '@/lib/schemas/spend-category'

export async function createSpendCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendCategoryInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('spend_categories')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spend_categories')
  return ok({ id: data.id })
}

export async function updateSpendCategory(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = spendCategoryInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('spend_categories')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spend_categories')
  return ok({ id })
}

export async function softDeleteSpendCategory(id: string): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  // Spends keep their category_id; the category tombstone still renders for
  // history (queries join without filtering the category's deleted_at).
  const { error } = await supabase
    .from('spend_categories')
    .update(getDeleteAuditFields(user.id))
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('spend_categories')
  return ok({ id })
}
