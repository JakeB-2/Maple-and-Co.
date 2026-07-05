// Read-side for calendar events. Rows carry the six embedded recur_* columns so
// fromDb(row) reconstructs the rule directly (see lib/recurrence). Occurrence
// expansion lives in calendar-window.ts; this layer just fetches live rows.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { RecurUnit, RecurSemantics } from '@/lib/recurrence/types'

export const CALENDAR_EVENT_SELECT = `
  id, title, note, location, starts_on, start_time, end_time, all_day,
  recur_unit, recur_interval, recur_weekdays, recur_month_day, recur_semantics, recur_until,
  created_at, created_by_user_id
` as const

export type CalendarEventRow = {
  id: string
  title: string
  note: string | null
  location: string | null
  starts_on: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  // Narrowed to the engine's unions (the DB CHECK guarantees membership) so
  // fromDb(row) reconstructs the rule without a cast. Events are fixed-only.
  recur_unit: RecurUnit | null
  recur_interval: number | null
  recur_weekdays: number[] | null
  recur_month_day: number | null
  recur_semantics: RecurSemantics | null
  recur_until: string | null
  created_at: string
  created_by_user_id: string | null
}

export type ExclusionRow = { id: string; event_id: string; occurs_on: string }

export async function fetchCalendarEvents(
  supabase: SupabaseClient<Database>
): Promise<CalendarEventRow[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(CALENDAR_EVENT_SELECT)
    .is('deleted_at', null)
    .order('starts_on')

  if (error) throw error
  return (data ?? []) as unknown as CalendarEventRow[]
}

export async function fetchCalendarEvent(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<CalendarEventRow | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(CALENDAR_EVENT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as CalendarEventRow | null
}

// Tiny join table (one row per suppressed occurrence). It has NO deleted_at
// column — removing an exclusion is a hard delete — so no live filter here.
export async function fetchEventExclusions(
  supabase: SupabaseClient<Database>
): Promise<ExclusionRow[]> {
  const { data, error } = await supabase
    .from('calendar_event_exclusions')
    .select('id, event_id, occurs_on')

  if (error) throw error
  return (data ?? []) as unknown as ExclusionRow[]
}
