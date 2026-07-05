'use server'

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { groceryItemInputSchema } from '@/lib/schemas/grocery'

export async function updateGroceryItem(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = groceryItemInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('grocery_items')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('grocery_items')
  return ok({ id })
}
