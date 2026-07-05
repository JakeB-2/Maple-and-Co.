import { describe, expect, it } from 'vitest'
import {
  expandOccurrences,
  freshness,
  fromDb,
  nextOccurrence,
  recurrenceRuleSchema,
  toDb,
} from '@/lib/recurrence'
import type { RecurrenceRule } from '@/lib/recurrence'

// One-off is `null`, so a factory always builds a recurring rule with sensible
// defaults; each test overrides only the fields it exercises.
function rule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    unit: 'day',
    interval: 1,
    weekdays: [],
    monthDay: null,
    semantics: 'fixed',
    until: null,
    ...overrides,
  }
}

const YEAR = { start: '2026-01-01', end: '2026-12-31' }

describe('expandOccurrences — weekly grid', () => {
  it('biweekly (interval 2) selects alternate weeks across a month boundary', () => {
    // Anchor is a Monday; fires Mon+Wed every other calendar week.
    const r = rule({ unit: 'week', interval: 2, weekdays: [1, 3] })
    const got = expandOccurrences(r, '2026-01-05', { start: '2026-01-01', end: '2026-02-28' })
    expect(got).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-19',
      '2026-01-21',
      '2026-02-02',
      '2026-02-04',
      '2026-02-16',
      '2026-02-18',
    ])
  })

  it('interval-3 anchored mid-week picks every third week and starts at the anchor', () => {
    // Anchor is Wed 2026-01-07 firing Mon+Wed+Fri. The Monday of the anchor week
    // (2026-01-05) precedes the anchor and must NOT appear — the series starts at
    // the anchor. Then only weeks 0, 3, 6 from the anchor qualify.
    const r = rule({ unit: 'week', interval: 3, weekdays: [1, 3, 5] })
    const got = expandOccurrences(r, '2026-01-07', { start: '2026-01-01', end: '2026-02-28' })
    expect(got).toEqual([
      '2026-01-07',
      '2026-01-09',
      '2026-01-26',
      '2026-01-28',
      '2026-01-30',
      '2026-02-16',
      '2026-02-18',
      '2026-02-20',
    ])
    expect(got).not.toContain('2026-01-05')
  })

  it('empty weekdays fall back to the anchor’s own weekday', () => {
    // Anchor is a Wednesday; every week with no explicit weekdays = every Wed.
    const r = rule({ unit: 'week', interval: 1, weekdays: [] })
    const got = expandOccurrences(r, '2026-01-07', { start: '2026-01-01', end: '2026-01-31' })
    expect(got).toEqual(['2026-01-07', '2026-01-14', '2026-01-21', '2026-01-28'])
  })
})

describe('expandOccurrences — monthly clamp', () => {
  it('clamps the 31st to each month’s last day (leap February, 30-day months)', () => {
    const r = rule({ unit: 'month', interval: 1, monthDay: 31 })
    const got = expandOccurrences(r, '2024-01-31', { start: '2024-01-01', end: '2024-06-30' })
    expect(got).toEqual([
      '2024-01-31',
      '2024-02-29', // 2024 is a leap year
      '2024-03-31',
      '2024-04-30', // 30-day month clamps to 30
      '2024-05-31',
      '2024-06-30',
    ])
  })

  it('clamps the 31st to Feb 28 in a non-leap year', () => {
    const r = rule({ unit: 'month', interval: 1, monthDay: 31 })
    const got = expandOccurrences(r, '2023-01-31', { start: '2023-01-01', end: '2023-03-31' })
    expect(got).toEqual(['2023-01-31', '2023-02-28', '2023-03-31'])
  })
})

describe('expandOccurrences — yearly', () => {
  it('Feb-29 anchor lands on Feb-28 in non-leap years and Feb-29 in leap years', () => {
    const r = rule({ unit: 'year', interval: 1 })
    const got = expandOccurrences(r, '2024-02-29', { start: '2024-01-01', end: '2028-12-31' })
    expect(got).toEqual([
      '2024-02-29', // leap
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29', // leap again — re-expanded from the anchor, not stuck at 28
    ])
  })
})

describe('interval > 1 — monthly/yearly far-bound jump', () => {
  // The monthly/yearly grids skip straight to the first qualifying period at or
  // before the bound (step = floor((boundIdx - anchorIdx) / interval)) instead
  // of stepping one period at a time. interval-1 tests never exercise that jump;
  // these pin the phase arithmetic for every-N-months/years rules.
  it('quarterly (interval 3) jumps past a far reference to the next on-the-15th', () => {
    const r = rule({ unit: 'month', interval: 3, monthDay: 15 })
    expect(nextOccurrence(r, '2026-01-15', '2026-08-20')).toBe('2026-10-15')
  })

  it('quarterly-on-31 clamps each quarter to the month’s last day', () => {
    const r = rule({ unit: 'month', interval: 3, monthDay: 31 })
    const got = expandOccurrences(r, '2026-01-31', YEAR)
    expect(got).toEqual(['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31'])
  })

  it('every-2-years jumps past a far reference to the next anchor-anniversary', () => {
    const r = rule({ unit: 'year', interval: 2 })
    // Anniversaries land on even offsets from 2026: 2026, 2028, 2030, 2032…
    expect(nextOccurrence(r, '2026-03-10', '2031-01-01')).toBe('2032-03-10')
  })
})

describe('expandOccurrences — until, window edges, exclusions', () => {
  it('treats `until` as inclusive', () => {
    const r = rule({ unit: 'day', interval: 1, until: '2026-03-05' })
    const got = expandOccurrences(r, '2026-03-01', { start: '2026-03-01', end: '2026-03-31' })
    expect(got).toEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'])
    expect(got).not.toContain('2026-03-06')
  })

  it('includes occurrences exactly on window.start and window.end', () => {
    const r = rule({ unit: 'day', interval: 1 })
    const got = expandOccurrences(r, '2026-03-01', { start: '2026-03-03', end: '2026-03-05' })
    expect(got).toEqual(['2026-03-03', '2026-03-04', '2026-03-05'])
  })

  it('removes exactly the excluded dates and nothing else', () => {
    const r = rule({ unit: 'day', interval: 1 })
    const got = expandOccurrences(
      r,
      '2026-03-01',
      { start: '2026-03-01', end: '2026-03-05' },
      ['2026-03-03']
    )
    expect(got).toEqual(['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05'])
  })
})

describe('nextOccurrence — fixed', () => {
  it('returns the earliest grid date STRICTLY after the reference date', () => {
    const r = rule({ unit: 'day', interval: 1 })
    expect(nextOccurrence(r, '2026-03-01', '2026-03-05')).toBe('2026-03-06')
    // Reference on an occurrence still advances past it.
    expect(nextOccurrence(r, '2026-03-01', '2026-03-01')).toBe('2026-03-02')
  })

  it('never returns a date before the anchor', () => {
    const r = rule({ unit: 'day', interval: 1 })
    expect(nextOccurrence(r, '2026-03-01', '2026-02-01')).toBe('2026-03-01')
  })

  it('returns null once the next grid date passes `until`', () => {
    const r = rule({ unit: 'day', interval: 1, until: '2026-03-03' })
    expect(nextOccurrence(r, '2026-03-01', '2026-03-03')).toBeNull()
  })
})

describe('after_done — projected, never a grid', () => {
  it('chains off the last completion; zero completions baseline off the anchor', () => {
    // weekdays/monthDay are deliberately set but must be ignored by after_done.
    const r = rule({ unit: 'month', interval: 1, semantics: 'after_done', weekdays: [2], monthDay: 5 })
    // No completion → next = anchor + interval.
    expect(nextOccurrence(r, '2026-01-10', '2026-05-01', null)).toBe('2026-02-10')
    // A completion advances the projection off the completion date.
    expect(nextOccurrence(r, '2026-01-10', '2026-05-01', '2026-03-15')).toBe('2026-04-15')
  })

  it('honors `until` on the projection', () => {
    const r = rule({ unit: 'month', interval: 1, semantics: 'after_done', until: '2026-01-31' })
    expect(nextOccurrence(r, '2026-01-10', '2026-01-10', null)).toBeNull()
  })

  it('expands to at most one date, never a grid', () => {
    const r = rule({ unit: 'day', interval: 3, semantics: 'after_done' })
    const got = expandOccurrences(r, '2026-01-01', YEAR)
    // A fixed daily/3 rule over a year would be ~120 dates; after_done yields one.
    expect(got).toEqual(['2026-01-04'])
    expect(got.length).toBeLessThanOrEqual(1)
  })

  it('yields nothing when the single projection falls outside the window', () => {
    const r = rule({ unit: 'month', interval: 1, semantics: 'after_done' })
    const got = expandOccurrences(r, '2026-01-10', { start: '2026-03-01', end: '2026-03-31' })
    expect(got).toEqual([])
  })
})

describe('freshness (D-017 — never shames)', () => {
  const base = { anchor: '2026-07-01', interval: 4, unit: 'day' as const }

  it('is fresh at ratio 0 and reports the projected dueOn', () => {
    const f = freshness({ ...base, lastDone: null, today: '2026-07-01' })
    expect(f.ratio).toBe(0)
    expect(f.stage).toBe('fresh')
    expect(f.dueOn).toBe('2026-07-05')
  })

  it('is aging exactly at the 0.75 boundary', () => {
    const f = freshness({ ...base, lastDone: null, today: '2026-07-04' }) // 3 / 4
    expect(f.ratio).toBe(0.75)
    expect(f.stage).toBe('aging')
  })

  it('is due exactly at the 1.0 boundary', () => {
    const f = freshness({ ...base, lastDone: null, today: '2026-07-05' }) // 4 / 4
    expect(f.ratio).toBe(1)
    expect(f.stage).toBe('due')
  })

  it('clamps a long-neglected task at ratio 1.5 (no red/overdue stage)', () => {
    const f = freshness({ ...base, lastDone: null, today: '2026-07-15' }) // 14 / 4 → 3.5
    expect(f.ratio).toBe(1.5)
    expect(f.stage).toBe('due')
  })

  it('re-freshens when an early completion moves the baseline closer to today', () => {
    const late = freshness({ ...base, lastDone: null, today: '2026-07-05' })
    const early = freshness({ ...base, lastDone: '2026-07-04', today: '2026-07-05' }) // 1 / 4
    expect(late.stage).toBe('due')
    expect(early.stage).toBe('fresh')
    expect(early.ratio).toBeLessThan(late.ratio)
    expect(early.dueOn).toBe('2026-07-08')
  })
})

describe('date math is timezone/DST-invariant', () => {
  it('yields exactly 7 consecutive days across a spring-forward date', () => {
    // 2026-03-08 is US spring-forward; moot in Cancún, but the count must be 7
    // whatever timezone the test host runs in — no skipped or doubled day.
    const r = rule({ unit: 'day', interval: 1 })
    const got = expandOccurrences(r, '2026-03-08', { start: '2026-03-08', end: '2026-03-14' })
    expect(got).toEqual([
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
    ])
    expect(got.length).toBe(7)
  })
})

describe('toDb / fromDb round-trip', () => {
  it('round-trips a fixed weekly rule', () => {
    const r = rule({ unit: 'week', interval: 2, weekdays: [1, 3], until: '2026-12-31' })
    expect(fromDb(toDb(r))).toEqual(r)
  })

  it('round-trips an after_done monthly rule', () => {
    const r = rule({ unit: 'month', interval: 1, monthDay: 5, semantics: 'after_done' })
    expect(fromDb(toDb(r))).toEqual(r)
  })

  it('round-trips a one-off as all-null columns and back to null', () => {
    const cols = toDb(null)
    expect(cols).toEqual({
      recur_unit: null,
      recur_interval: null,
      recur_weekdays: null,
      recur_month_day: null,
      recur_semantics: null,
      recur_until: null,
    })
    expect(fromDb(cols)).toBeNull()
  })
})

describe('recurrenceRuleSchema', () => {
  it('accepts a well-formed rule and rejects a fixed monthly rule with no monthDay', () => {
    expect(recurrenceRuleSchema.safeParse(rule({ unit: 'week', weekdays: [0, 6] })).success).toBe(true)
    const badMonthly = { ...rule({ unit: 'month' }), monthDay: null }
    expect(recurrenceRuleSchema.safeParse(badMonthly).success).toBe(false)
  })
})
