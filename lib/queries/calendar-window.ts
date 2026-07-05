// Pure occurrence expansion + month-grid geometry for the calendar screen. No
// Supabase, no client: every date is derived through the recurrence engine
// (lib/recurrence), so this is fully unit-testable. calendar-events.ts fetches
// the live rows; this layer turns them into the dated occurrences a month view
// and agenda render.

import type { CalendarEventRow } from './calendar-events'
import { addDays, addMonths, expandOccurrences, fromDb, weekdayOf } from '@/lib/recurrence'
import { sanitizeUuidParam } from '@/lib/utils'

export type EventOccurrence = {
  event: CalendarEventRow
  date: string // 'YYYY-MM-DD'
  key: string // `${event.id}:${date}` — the ?selected= occurrence grammar
}

const WEEKS_IN_GRID = 6
const DAYS_IN_WEEK = 7
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Expand every event into its occurrences within [window.start, window.end]
 * INCLUSIVE, minus exclusions, sorted by (date, start_time nulls-first, title).
 * A one-off event (recurrence null) contributes its single starts_on if it lands
 * in the window and isn't excluded.
 */
export function expandEventOccurrences(
  events: CalendarEventRow[],
  exclusionsByEvent: Map<string, Set<string>>,
  window: { start: string; end: string }
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = []

  for (const event of events) {
    const excluded = exclusionsByEvent.get(event.id)
    // The six recur_* columns ARE a RecurrenceDbColumns (row types narrow
    // unit/semantics to the engine unions), so fromDb takes the row directly.
    const rule = fromDb(event)

    const dates =
      rule === null
        ? oneOffDates(event.starts_on, window, excluded)
        : expandOccurrences(rule, event.starts_on, window, excluded)

    for (const date of dates) {
      occurrences.push({ event, date, key: `${event.id}:${date}` })
    }
  }

  occurrences.sort(compareOccurrences)
  return occurrences
}

// A one-off yields its single date only when it lands inside the (inclusive)
// window and isn't suppressed. 'YYYY-MM-DD' strings order chronologically.
function oneOffDates(
  startsOn: string,
  window: { start: string; end: string },
  excluded: Set<string> | undefined
): string[] {
  const inWindow = startsOn >= window.start && startsOn <= window.end
  return inWindow && !excluded?.has(startsOn) ? [startsOn] : []
}

// (date), then all-day/untimed before timed (null start_time first), then the
// start_time string, then the title — a stable agenda order within each day.
function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1

  const at = a.event.start_time
  const bt = b.event.start_time
  if (at !== bt) {
    if (at === null) return -1
    if (bt === null) return 1
    return at < bt ? -1 : 1
  }

  if (a.event.title !== b.event.title) return a.event.title < b.event.title ? -1 : 1
  return 0
}

/** Group occurrences by their date, preserving each day's sorted order. */
export function groupOccurrencesByDate(
  occurrences: EventOccurrence[]
): Map<string, EventOccurrence[]> {
  const byDate = new Map<string, EventOccurrence[]>()
  for (const occurrence of occurrences) {
    const bucket = byDate.get(occurrence.date)
    if (bucket) bucket.push(occurrence)
    else byDate.set(occurrence.date, [occurrence])
  }
  return byDate
}

/**
 * A 6-row × 7-col month matrix of 'YYYY-MM-DD' strings (Sunday-started weeks)
 * covering `month` ('YYYY-MM'), including the leading/trailing days from the
 * adjacent months needed to fill the grid.
 */
export function buildMonthMatrix(month: string): string[][] {
  const firstOfMonth = `${month}-01`
  // Back up to the Sunday on or before the 1st (weekdayOf: 0 = Sunday).
  const gridStart = addDays(firstOfMonth, -weekdayOf(firstOfMonth))

  const weeks: string[][] = []
  for (let row = 0; row < WEEKS_IN_GRID; row++) {
    const week: string[] = []
    for (let col = 0; col < DAYS_IN_WEEK; col++) {
      week.push(addDays(gridStart, row * DAYS_IN_WEEK + col))
    }
    weeks.push(week)
  }
  return weeks
}

/** The inclusive date window a month matrix spans — feed to expandEventOccurrences. */
export function monthGridWindow(month: string): { start: string; end: string } {
  const grid = buildMonthMatrix(month)
  return { start: grid[0][0], end: grid[WEEKS_IN_GRID - 1][DAYS_IN_WEEK - 1] }
}

/**
 * Parse the `?selected=<id>:<date>` occurrence key, splitting on the FIRST ':'.
 * Returns null if malformed. (sanitizeUuidParam rejects the composite key, so
 * each half is validated on its own — a uuid id and a 'YYYY-MM-DD' date.)
 */
export function parseOccurrenceKey(
  param: string | undefined
): { id: string; date: string } | null {
  if (param === undefined) return null

  const separator = param.indexOf(':')
  if (separator === -1) return null

  const id = sanitizeUuidParam(param.slice(0, separator))
  const date = param.slice(separator + 1)
  if (id === null || !ISO_DATE_RE.test(date)) return null

  return { id, date }
}

/** Shift a 'YYYY-MM' by ±1 month (via the engine's month math). */
export function shiftMonth(month: string, delta: -1 | 1): string {
  return addMonths(`${month}-01`, delta).slice(0, 7)
}
