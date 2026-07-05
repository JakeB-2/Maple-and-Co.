'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { storeInputSchema } from '@/lib/schemas/store'

export async function createStore(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = storeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase
    .from('stores')
    .insert({ ...parsed.data, ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('stores')
  return ok({ id: data.id })
}

export async function updateStore(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = storeInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('stores')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('stores')
  return ok({ id })
}
