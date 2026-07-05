'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import type { Database } from '@/lib/database.types'
import {
  addEntryInputSchema,
  quickAddInputSchema,
  groceryEntryInputSchema,
  checkOffInputSchema,
  uncheckInputSchema,
  placementInputSchema,
} from '@/lib/schemas/grocery'

// Shared tail of both add paths: reuse the live active entry if one exists
// (one-tap adds are idempotent), else insert a fresh entry.
async function reuseOrCreateEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  item: { id: string; default_qty: string | null }
): Promise<ActionResult<{ id: string }>> {
  const { data: existing, error: existingError } = await supabase
    .from('grocery_list_entries')
    .select('id')
    .eq('grocery_item_id', item.id)
    .is('purchased_at', null)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingError) return fail(sanitizeActionError(existingError))
  if (existing) return ok({ id: existing.id })

  const { data, error } = await supabase
    .from('grocery_list_entries')
    .insert({ grocery_item_id: item.id, qty: item.default_qty, ...getCreateAuditFields(userId) })
    .select('id')
    .single()

  if (error) {
    // Two phones adding the same item at once: the partial unique index
    // rejects the loser — reuse the winner's row instead of erroring.
    if (error.code === '23505') {
      const { data: winner, error: winnerError } = await supabase
        .from('grocery_list_entries')
        .select('id')
        .eq('grocery_item_id', item.id)
        .is('purchased_at', null)
        .is('deleted_at', null)
        .maybeSingle()

      if (winnerError) return fail(sanitizeActionError(winnerError))
      if (winner) return ok({ id: winner.id })
    }
    return fail(sanitizeActionError(error))
  }
  revalidateTable('grocery_list_entries')
  return ok({ id: data.id })
}

export async function addEntryForItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = addEntryInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data: item, error: itemError } = await supabase
    .from('grocery_items')
    .select('id, default_qty')
    .eq('id', parsed.data.grocery_item_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (itemError) return fail(sanitizeActionError(itemError))
  if (!item) return fail('That item is gone.')

  return reuseOrCreateEntry(supabase, user.id, item)
}

export async function quickAddEntry(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = quickAddInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  // Escape LIKE wildcards so the typed name only matches literally.
  const { data: match, error: matchError } = await supabase
    .from('grocery_items')
    .select('id, default_qty')
    .ilike('name', parsed.data.name.replace(/([\\%_])/g, '\\$1'))
    .is('deleted_at', null)
    .maybeSingle()

  if (matchError) return fail(sanitizeActionError(matchError))

  let item = match
  if (!item) {
    // New items ride on the DB defaults for emoji/default_qty.
    const { data: created, error: createdError } = await supabase
      .from('grocery_items')
      .insert({ name: parsed.data.name, ...getCreateAuditFields(user.id) })
      .select('id, default_qty')
      .single()

    if (createdError) return fail(sanitizeActionError(createdError))
    revalidateTable('grocery_items')
    item = created
  }

  return reuseOrCreateEntry(supabase, user.id, item)
}

export async function updateEntry(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = groceryEntryInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { error } = await supabase
    .from('grocery_list_entries')
    .update({ ...parsed.data, ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('grocery_list_entries')
  return ok({ id })
}

export async function checkOffEntry(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = checkOffInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase.rpc('fn_check_off_grocery_entry', {
    p_entry_id: parsed.data.entry_id,
    p_store_id: parsed.data.store_id,
    // Nullable in SQL (skipping the till prompt); typegen types args as required.
    p_price: parsed.data.price as number,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  if (!data) return fail('Someone already picked that up.')

  revalidateTable('grocery_list_entries')
  if (parsed.data.price != null) revalidateTable('grocery_item_prices')
  return ok({ id: parsed.data.entry_id })
}

export async function uncheckEntry(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = uncheckInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase.rpc('fn_uncheck_grocery_entry', {
    p_entry_id: parsed.data.entry_id,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  if (!data) return fail("That one isn't checked off.")

  revalidateTable('grocery_list_entries')
  revalidateTable('grocery_item_prices')
  return ok({ id: parsed.data.entry_id })
}

export async function setItemPlacement(input: unknown): Promise<ActionResult<null>> {
  const { user, supabase } = await requireAuth()

  const parsed = placementInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  // Update-then-insert instead of upsert: actor columns are stamped app-side
  // (D-019) and an upsert would either skip created_by or clobber it.
  const { grocery_item_id, store_id, section_id } = parsed.data
  const audit = getUpdateAuditFields(user.id)

  const { data: updated, error: updateError } = await supabase
    .from('grocery_item_placements')
    .update({ section_id, ...audit })
    .eq('grocery_item_id', grocery_item_id)
    .eq('store_id', store_id)
    .select('id')

  if (updateError) return fail(sanitizeActionError(updateError))

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('grocery_item_placements')
      .insert({ ...parsed.data, ...getCreateAuditFields(user.id), ...audit })

    if (insertError) {
      // Lost the insert race: the row exists now, so file it via update.
      if (insertError.code === '23505') {
        const { error: retryError } = await supabase
          .from('grocery_item_placements')
          .update({ section_id, ...audit })
          .eq('grocery_item_id', grocery_item_id)
          .eq('store_id', store_id)

        if (retryError) return fail(sanitizeActionError(retryError))
      } else {
        return fail(sanitizeActionError(insertError))
      }
    }
  }

  revalidateTable('grocery_item_placements')
  return ok(null)
}
