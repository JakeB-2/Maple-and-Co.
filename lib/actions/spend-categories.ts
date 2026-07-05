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

// Swap sort_order with the neighbor above/below — up/down buttons, no dnd lib.
export async function moveSpendCategory(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  const { user, supabase } = await requireAuth()

  const { data: categories, error } = await supabase
    .from('spend_categories')
    .select('id, sort_order')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) return fail(sanitizeActionError(error))

  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return fail('Category not found.')
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= categories.length) return ok(undefined)

  const a = categories[index]
  const b = categories[swapWith]
  const audit = getUpdateAuditFields(user.id)

  const [ra, rb] = await Promise.all([
    supabase.from('spend_categories').update({ sort_order: b.sort_order, ...audit }).eq('id', a.id),
    supabase.from('spend_categories').update({ sort_order: a.sort_order, ...audit }).eq('id', b.id),
  ])

  if (ra.error || rb.error) return fail(sanitizeActionError(ra.error ?? rb.error))
  revalidateTable('spend_categories')
  return ok(undefined)
}
