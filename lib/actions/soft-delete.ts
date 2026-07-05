'use server'

// Generic soft delete + restore behind a table whitelist — the server half of
// use-soft-delete-with-undo's contract (Portal's 1800-line version is business
// rules we don't have; the contract is the same: ok(null) = done).
// Row-level entities only — never used to cascade parents.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getDeleteAuditFields, getRestoreAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'

const SOFT_DELETABLE = [
  'spends',
  'spend_categories',
  'comments',
  'stores',
  'store_sections',
  'grocery_items',
  'grocery_list_entries',
  // grows per milestone: pet_events (M3), calendar/tasks (M4)
] as const

type SoftDeletableTable = (typeof SOFT_DELETABLE)[number]

function assertTable(table: string): table is SoftDeletableTable {
  return (SOFT_DELETABLE as readonly string[]).includes(table)
}

export async function softDelete(table: string, id: string): Promise<ActionResult<null>> {
  const { user, supabase } = await requireAuth()
  if (!assertTable(table)) return fail('That cannot be deleted.')

  const { error } = await supabase
    .from(table)
    // All whitelisted tables share the audit column set; the union of their
    // Update types collapses in supabase-js generics, hence the cast.
    .update(getDeleteAuditFields(user.id) as never)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable(table)
  return ok(null)
}

export async function restoreSoftDelete(table: string, id: string): Promise<ActionResult<null>> {
  const { user, supabase } = await requireAuth()
  if (!assertTable(table)) return fail('That cannot be restored.')

  const { error } = await supabase
    .from(table)
    .update(getRestoreAuditFields(user.id) as never)
    .eq('id', id)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable(table)
  return ok(null)
}
