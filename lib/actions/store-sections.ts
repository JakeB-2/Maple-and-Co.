'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { storeSectionInputSchema } from '@/lib/schemas/store'

export async function createStoreSection(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = storeSectionInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('store_sections')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('store_sections')
  return ok({ id: data.id })
}

export async function updateStoreSection(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = storeSectionInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('store_sections')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('store_sections')
  return ok({ id })
}
