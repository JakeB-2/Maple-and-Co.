// Pure 'YYYY-MM-DD' date math for the recurrence engine.
//
// Everything here works on the Y/M/D integers via UTC Date construction
// (Date.UTC / getUTC*), NEVER host-local `new Date(str)` or the local-getter
// helpers in lib/format-date.ts. Rationale: the engine must produce identical
// results on any CI machine's timezone, and local-midnight Date arithmetic
// silently skips or repeats a day across a DST transition. UTC has no DST, so
// UTC integer math is drift-free. (HOUSEHOLD_TZ is fixed UTC-5 no-DST anyway,
// but the tests pin this invariant on machines that aren't.)

import type { RecurUnit } from './types'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

export type Ymd = { year: number; month: number; day: number }

/** Parse a 'YYYY-MM-DD' string into integers; throws on a malformed value. */
export function parseYmd(iso: string): Ymd {
  const match = ISO_DATE.exec(iso)
  if (!match) throw new RangeError(`Not a 'YYYY-MM-DD' date: ${iso}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`Not a valid calendar date: ${iso}`)
  }
  return { year, month, day }
}

/** Format Y/M/D integers back to a zero-padded 'YYYY-MM-DD' string. */
export function formatYmd({ year, month, day }: Ymd): string {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Days since 1970-01-01 (UTC), an exact integer for any date-only value. */
export function toEpochDay(iso: string): number {
  const { year, month, day } = parseYmd(iso)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

/** Inverse of toEpochDay. */
export function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY)
  return formatYmd({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

/** Number of days in a 1-indexed month (handles leap Februaries). */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next 0-indexed month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Weekday, 0=Sunday..6=Saturday (matches recur_weekdays and getUTCDay). */
export function weekdayOf(iso: string): number {
  return new Date(toEpochDay(iso) * MS_PER_DAY).getUTCDay()
}

/**
 * Sunday-started calendar-week bucket index. Two dates in the same Sun–Sat week
 * share an index; consecutive weeks differ by 1. Used by the weekly grid to
 * test `(weekIndex - anchorWeekIndex) % interval === 0`. 1970-01-04 (epoch day
 * 3) was a Sunday, so subtracting 3 aligns the floor-division to week starts.
 */
export function weekIndexOf(iso: string): number {
  return Math.floor((toEpochDay(iso) - 3) / 7)
}

/** Chronological comparison; ISO 'YYYY-MM-DD' sorts lexicographically. */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Signed day count from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from)
}

export function addDays(iso: string, n: number): string {
  return fromEpochDay(toEpochDay(iso) + n)
}

export function addWeeks(iso: string, n: number): string {
  return addDays(iso, n * 7)
}

/**
 * Add whole months, clamping the day to the target month's last day — Jan 31 +
 * 1 month = Feb 28/29, not an overflow into March. Floor division keeps the
 * year/month correct for negative offsets too.
 */
export function addMonths(iso: string, n: number): string {
  const { year, month, day } = parseYmd(iso)
  const zeroBasedMonth = year * 12 + (month - 1) + n
  const newYear = Math.floor(zeroBasedMonth / 12)
  const newMonth = zeroBasedMonth - newYear * 12 + 1
  const clampedDay = Math.min(day, daysInMonth(newYear, newMonth))
  return formatYmd({ year: newYear, month: newMonth, day: clampedDay })
}

/**
 * Add whole years. Same month-end clamp as addMonths, so a Feb-29 anchor lands
 * on Feb-28 in non-leap target years and back on Feb-29 in leap ones.
 */
export function addYears(iso: string, n: number): string {
  return addMonths(iso, n * 12)
}

/** Advance a date by `interval` of the given recurrence unit. */
export function addByUnit(iso: string, unit: RecurUnit, interval: number): string {
  switch (unit) {
    case 'day':
      return addDays(iso, interval)
    case 'week':
      return addWeeks(iso, interval)
    case 'month':
      return addMonths(iso, interval)
    case 'year':
      return addYears(iso, interval)
  }
}
