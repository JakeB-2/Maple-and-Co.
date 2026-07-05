'use server'

// Server actions are public POST endpoints — requireAuth() gates every one.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { getCreateAuditFields, getUpdateAuditFields } from '@/lib/audit'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { toDb } from '@/lib/recurrence/types'
import { calendarEventInputSchema } from '@/lib/schemas/calendar-event'

export async function createCalendarEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = calendarEventInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  // The rule fans out into the 6 embedded recur_* columns (D-015); everything
  // else on the parsed shape maps straight to a column.
  const { recurrence, ...fields } = parsed.data

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...fields, ...toDb(recurrence), ...getCreateAuditFields(user.id) })
    .select('id')
    .single()

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('calendar_events')
  return ok({ id: data.id })
}

export async function updateCalendarEvent(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = calendarEventInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { recurrence, ...fields } = parsed.data

  const { error } = await supabase
    .from('calendar_events')
    .update({ ...fields, ...toDb(recurrence), ...getUpdateAuditFields(user.id) })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('calendar_events')
  return ok({ id })
}

export async function addEventExclusion(eventId: string, occursOn: string): Promise<ActionResult> {
  const { user, supabase } = await requireAuth()

  const { error } = await supabase
    .from('calendar_event_exclusions')
    .insert({ event_id: eventId, occurs_on: occursOn, ...getCreateAuditFields(user.id) })

  // Already excluded is the desired end state — the UNIQUE violation is an
  // idempotent no-op, not an error worth showing.
  if (error && error.code !== '23505') return fail(sanitizeActionError(error))
  revalidateTable('calendar_event_exclusions')
  return ok(undefined)
}

export async function removeEventExclusion(eventId: string, occursOn: string): Promise<ActionResult> {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('calendar_event_exclusions')
    .delete()
    .eq('event_id', eventId)
    .eq('occurs_on', occursOn)

  if (error) return fail(sanitizeActionError(error))
  revalidateTable('calendar_event_exclusions')
  return ok(undefined)
}
