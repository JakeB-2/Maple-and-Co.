import type { RecurrenceRule } from './types'
import {
  addByUnit,
  compareDates,
  daysInMonth,
  formatYmd,
  fromEpochDay,
  parseYmd,
  toEpochDay,
  weekIndexOf,
  weekdayOf,
} from './local-date'

// Small guard on the per-unit grid searches below. Each search lands on the
// answer within one or two qualifying steps (see the comments), so this cap is
// only a safety net against a pathological input, never a normal exit.
const SEARCH_GUARD = 64

/**
 * The next occurrence strictly AFTER `after`, or null if the series has ended.
 *
 * Strictly-after (not on-or-after) is the deliberate choice: callers ask "given
 * this date, when is the next one?" — the reference date itself is never the
 * answer. Use `expandOccurrences` for an inclusive window.
 *
 * - `fixed`: the earliest grid date > `after` (and >= `anchor`), honoring
 *   `until`. `lastDone` is IGNORED — a fixed grid is independent of completion.
 * - `after_done`: `(lastDone ?? anchor) + interval × unit`, honoring `until`.
 *   `after` and the weekday/month-day fields are IGNORED — there is exactly one
 *   projected due date at a time.
 */
export function nextOccurrence(
  rule: RecurrenceRule,
  anchor: string,
  after: string,
  lastDone?: string | null
): string | null {
  if (rule.semantics === 'after_done') {
    const due = addByUnit(lastDone ?? anchor, rule.unit, rule.interval)
    return withinUntil(due, rule.until) ? due : null
  }

  // Strictly-after: the earliest grid date is >= max(anchor, after + 1 day).
  const anchorFloor = compareDates(anchor, after) > 0 ? anchor : addDaysStr(after, 1)
  const occ = firstFixedOnOrAfter(rule, anchor, anchorFloor)
  if (occ === null) return null
  return withinUntil(occ, rule.until) ? occ : null
}

function withinUntil(date: string, until: string | null): boolean {
  return until === null || compareDates(date, until) <= 0
}

function addDaysStr(iso: string, n: number): string {
  return fromEpochDay(toEpochDay(iso) + n)
}

// First fixed-grid occurrence on or after `lowerBound` (which already sits at or
// past the anchor). Returned before the `until` check.
function firstFixedOnOrAfter(rule: RecurrenceRule, anchor: string, lowerBound: string): string {
  switch (rule.unit) {
    case 'day':
      return firstDaily(anchor, rule.interval, lowerBound)
    case 'week':
      return firstWeekly(rule, anchor, lowerBound)
    case 'month':
      return firstMonthly(rule, anchor, lowerBound)
    case 'year':
      return firstYearly(anchor, rule.interval, lowerBound)
  }
}

function firstDaily(anchor: string, interval: number, lowerBound: string): string {
  const anchorDay = toEpochDay(anchor)
  const boundDay = toEpochDay(lowerBound)
  if (boundDay <= anchorDay) return anchor
  const steps = Math.ceil((boundDay - anchorDay) / interval)
  return fromEpochDay(anchorDay + steps * interval)
}

function firstWeekly(rule: RecurrenceRule, anchor: string, lowerBound: string): string {
  // Empty weekdays = repeat on the anchor's own weekday.
  const weekdays = rule.weekdays.length
    ? [...new Set(rule.weekdays)].sort((a, b) => a - b)
    : [weekdayOf(anchor)]
  const anchorWeek = weekIndexOf(anchor)
  const anchorDay = toEpochDay(anchor)
  const boundDay = toEpochDay(lowerBound)

  // Advance to the first qualifying week (multiple of `interval` from anchor's)
  // at or after the lowerBound's week.
  let week = weekIndexOf(lowerBound)
  const phase = (((week - anchorWeek) % rule.interval) + rule.interval) % rule.interval
  if (phase !== 0) week += rule.interval - phase

  for (let guard = 0; guard < SEARCH_GUARD; guard++, week += rule.interval) {
    // Sundays are epoch days ≡ 3 (mod 7); week `w` starts at 7w + 3.
    const sunday = week * 7 + 3
    for (const weekday of weekdays) {
      const day = sunday + weekday
      // The series starts at the anchor, so occurrences before it never appear
      // (e.g. the Monday of the anchor week when the anchor is that Wednesday).
      if (day >= anchorDay && day >= boundDay) return fromEpochDay(day)
    }
  }
  // Unreachable for a real interval: a fresh qualifying week always yields one.
  return fromEpochDay(anchorDay)
}

function firstMonthly(rule: RecurrenceRule, anchor: string, lowerBound: string): string {
  const anchorParts = parseYmd(anchor)
  // Fall back to the anchor's day-of-month if monthDay is somehow absent.
  const monthDay = rule.monthDay ?? anchorParts.day
  const anchorMonthIndex = anchorParts.year * 12 + (anchorParts.month - 1)
  const boundParts = parseYmd(lowerBound)
  const boundMonthIndex = boundParts.year * 12 + (boundParts.month - 1)

  // Start at the last qualifying month <= the bound's month, then step forward
  // one qualifying month at a time until the (day-clamped) date clears the bound.
  let step = 0
  if (boundMonthIndex > anchorMonthIndex) {
    step = Math.floor((boundMonthIndex - anchorMonthIndex) / rule.interval)
  }
  for (let guard = 0; guard < SEARCH_GUARD; guard++, step++) {
    const monthIndex = anchorMonthIndex + step * rule.interval
    const year = Math.floor(monthIndex / 12)
    const month = monthIndex - year * 12 + 1
    const day = Math.min(monthDay, daysInMonth(year, month))
    const occ = formatYmd({ year, month, day })
    if (compareDates(occ, lowerBound) >= 0) return occ
  }
  return anchor
}

function firstYearly(anchor: string, interval: number, lowerBound: string): string {
  const anchorYear = parseYmd(anchor).year
  const boundYear = parseYmd(lowerBound).year
  let step = 0
  if (boundYear > anchorYear) step = Math.floor((boundYear - anchorYear) / interval)
  for (let guard = 0; guard < SEARCH_GUARD; guard++, step++) {
    // Always project from the original anchor so a Feb-29 anchor re-expands to
    // Feb-29 in leap years rather than sticking at a once-clamped Feb-28.
    const occ = addByUnit(anchor, 'year', step * interval)
    if (compareDates(occ, lowerBound) >= 0) return occ
  }
  return anchor
}
