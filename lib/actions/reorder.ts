'use server'

// Generic sort_order neighbor swap behind a table whitelist — one reorder
// action for every up/down settings list (the reorder twin of soft-delete.ts).

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'

const SORTABLE: Record<string, { scopeColumn?: string }> = {
  spend_categories: {},
  stores: {},
  store_sections: { scopeColumn: 'store_id' }, // ordering is per-store
  pet_event_types: {},
  pet_event_attributes: { scopeColumn: 'event_type_id' }, // ordering is per-type
}

// Swap sort_order with the neighbor above/below — up/down buttons, no dnd lib.
// All sortable tables share id + sort_order and the queries only touch those;
// supabase-js generics collapse over a dynamic table name, so the builders are
// typed against a representative table (same trade as soft-delete.ts).
export async function moveSortable(
  table: string,
  id: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  const { user, supabase } = await requireAuth()

  const sortable = SORTABLE[table]
  if (!sortable) return fail('Not sortable.')

  let query = supabase
    .from(table as 'spend_categories')
    .select('id, sort_order')
    .is('deleted_at', null)

  if (sortable.scopeColumn) {
    const { data: row, error: rowError } = await supabase
      .from(table as 'spend_categories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (rowError) return fail(sanitizeActionError(rowError))
    if (!row) return fail('Row not found.')

    query = query.eq(
      sortable.scopeColumn,
      (row as Record<string, unknown>)[sortable.scopeColumn] as string
    )
  }

  const { data: rows, error } = await query.order('sort_order')

  if (error) return fail(sanitizeActionError(error))

  const index = rows.findIndex((r) => r.id === id)
  if (index === -1) return fail('Row not found.')
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= rows.length) return ok(undefined)

  const a = rows[index]
  const b = rows[swapWith]
  const audit = getUpdateAuditFields(user.id)

  const [ra, rb] = await Promise.all([
    supabase
      .from(table as 'spend_categories')
      .update({ sort_order: b.sort_order, ...audit })
      .eq('id', a.id),
    supabase
      .from(table as 'spend_categories')
      .update({ sort_order: a.sort_order, ...audit })
      .eq('id', b.id),
  ])

  if (ra.error || rb.error) return fail(sanitizeActionError(ra.error ?? rb.error))
  revalidateTable(table)
  return ok(undefined)
}
