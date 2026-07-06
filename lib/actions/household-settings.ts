'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { householdSettingsInputSchema } from '@/lib/schemas/household-settings'

// household_settings is a seeded singleton (id=true) — no create/delete, only
// this update. No soft delete either: there's nothing sensible to restore to.
export async function updateHouseholdSettings(input: unknown): Promise<ActionResult<null>> {
  const { user, supabase } = await requireAuth()

  const parsed = householdSettingsInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('household_settings')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', true)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('household_settings')
  // app_title feeds generateMetadata in the root layout — a page-level
  // revalidate wouldn't refresh the <title>, so bust the whole layout tree.
  revalidatePath('/', 'layout')
  return ok(null)
}
