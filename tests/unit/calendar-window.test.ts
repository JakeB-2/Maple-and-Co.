import { describe, expect, it } from 'vitest'
import {
  buildMonthMatrix,
  expandEventOccurrences,
  groupOccurrencesByDate,
  monthGridWindow,
  parseOccurrenceKey,
  shiftMonth,
} from '@/lib/queries/calendar-window'
import { weekdayOf } from '@/lib/recurrence'
import type { CalendarEventRow } from '@/lib/queries/calendar-events'

// The pure functions never touch Supabase, so tests just build plain rows. A
// one-off is all-null recur columns; each test overrides only what it exercises.
function eventRow(overrides: Partial<CalendarEventRow> = {}): CalendarEventRow {
  return {
    id: crypto.randomUUID(),
    title: 'Event',
    note: null,
    location: null,
    starts_on: '2026-07-01',
    start_time: null,
    end_time: null,
    all_day: false,
    recur_unit: null,
    recur_interval: null,
    recur_weekdays: null,
    recur_month_day: null,
    recur_semantics: null,
    recur_until: null,
    created_at: '2026-07-01T12:00:00Z',
    created_by_user_id: 'user-1',
    ...overrides,
  }
}

// A fixed daily recurring event (the simplest grid).
function dailyEvent(overrides: Partial<CalendarEventRow> = {}): CalendarEventRow {
  return eventRow({
    recur_unit: 'day',
    recur_interval: 1,
    recur_semantics: 'fixed',
    ...overrides,
  })
}

const NO_EXCLUSIONS = new Map<string, Set<string>>()

describe('expandEventOccurrences — windows and exclusions', () => {
  it('includes occurrences exactly on window.start and window.end (inclusive edges)', () => {
    const event = dailyEvent({ starts_on: '2026-03-01' })
    const got = expandEventOccurrences([event], NO_EXCLUSIONS, {
      start: '2026-03-03',
      end: '2026-03-05',
    })
    expect(got.map((o) => o.date)).toEqual(['2026-03-03', '2026-03-04', '2026-03-05'])
    // Every occurrence carries its parent event and the `${id}:${date}` key.
    expect(got[0].event).toBe(event)
    expect(got[0].key).toBe(`${event.id}:2026-03-03`)
  })

  it('expands a biweekly series across a month boundary', () => {
    // Anchor is a Monday; fires Mon+Wed every other calendar week.
    const event = eventRow({
      starts_on: '2026-01-05',
      recur_unit: 'week',
      recur_interval: 2,
      recur_weekdays: [1, 3],
      recur_semantics: 'fixed',
    })
    const got = expandEventOccurrences([event], NO_EXCLUSIONS, {
      start: '2026-01-01',
      end: '2026-02-28',
    })
    expect(got.map((o) => o.date)).toEqual([
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

  it('drops exactly the excluded date and nothing else', () => {
    const event = dailyEvent({ starts_on: '2026-03-01' })
    const exclusions = new Map([[event.id, new Set(['2026-03-03'])]])
    const got = expandEventOccurrences([event], exclusions, {
      start: '2026-03-01',
      end: '2026-03-05',
    })
    expect(got.map((o) => o.date)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-04',
      '2026-03-05',
    ])
  })
})

describe('expandEventOccurrences — one-off events', () => {
  const window = { start: '2026-03-01', end: '2026-03-05' }

  it('contributes its single starts_on when inside the window', () => {
    const event = eventRow({ starts_on: '2026-03-04' })
    const got = expandEventOccurrences([event], NO_EXCLUSIONS, window)
    expect(got.map((o) => o.date)).toEqual(['2026-03-04'])
    expect(got).toHaveLength(1)
  })

  it('contributes nothing when its starts_on is outside the window', () => {
    const event = eventRow({ starts_on: '2026-02-01' })
    expect(expandEventOccurrences([event], NO_EXCLUSIONS, window)).toEqual([])
  })

  it('honors inclusive window edges for a one-off', () => {
    const onStart = eventRow({ starts_on: '2026-03-01' })
    const onEnd = eventRow({ starts_on: '2026-03-05' })
    expect(expandEventOccurrences([onStart], NO_EXCLUSIONS, window).map((o) => o.date)).toEqual([
      '2026-03-01',
    ])
    expect(expandEventOccurrences([onEnd], NO_EXCLUSIONS, window).map((o) => o.date)).toEqual([
      '2026-03-05',
    ])
  })

  it('is dropped when its single date is excluded', () => {
    const event = eventRow({ starts_on: '2026-03-04' })
    const exclusions = new Map([[event.id, new Set(['2026-03-04'])]])
    expect(expandEventOccurrences([event], exclusions, window)).toEqual([])
  })
})

describe('expandEventOccurrences — sort order', () => {
  it('orders by date, then untimed before timed, then start_time, then title', () => {
    const later = eventRow({ starts_on: '2026-03-02', title: 'Later', start_time: null })
    const timedBeta = eventRow({ starts_on: '2026-03-01', title: 'Beta', start_time: '09:00' })
    const timedAlpha = eventRow({ starts_on: '2026-03-01', title: 'Alpha', start_time: '09:00' })
    const allDay = eventRow({
      starts_on: '2026-03-01',
      title: 'Zoo',
      start_time: null,
      all_day: true,
    })
    const got = expandEventOccurrences([later, timedBeta, timedAlpha, allDay], NO_EXCLUSIONS, {
      start: '2026-03-01',
      end: '2026-03-02',
    })
    // Mar 1: untimed 'Zoo' first, then 09:00 by title (Alpha < Beta); then Mar 2.
    expect(got.map((o) => o.event.title)).toEqual(['Zoo', 'Alpha', 'Beta', 'Later'])
  })

  it('orders two timed events on the same day by start_time', () => {
    const nine = eventRow({ starts_on: '2026-03-01', start_time: '09:00' })
    const eight = eventRow({ starts_on: '2026-03-01', start_time: '08:00' })
    const got = expandEventOccurrences([nine, eight], NO_EXCLUSIONS, {
      start: '2026-03-01',
      end: '2026-03-01',
    })
    expect(got.map((o) => o.event.start_time)).toEqual(['08:00', '09:00'])
  })
})

describe('groupOccurrencesByDate', () => {
  it('buckets by date in chronological insertion order, keeping each day sorted', () => {
    const recurring = dailyEvent({ starts_on: '2026-03-01' })
    const timed = eventRow({ starts_on: '2026-03-01', start_time: '09:00', title: 'Timed' })
    const occ = expandEventOccurrences([recurring, timed], NO_EXCLUSIONS, {
      start: '2026-03-01',
      end: '2026-03-02',
    })
    const grouped = groupOccurrencesByDate(occ)
    expect([...grouped.keys()]).toEqual(['2026-03-01', '2026-03-02'])
    expect(grouped.get('2026-03-01')).toHaveLength(2)
    expect(grouped.get('2026-03-02')).toHaveLength(1)
    // Within the day, untimed (recurring) sorts before the 09:00 one-off.
    expect(grouped.get('2026-03-01')!.map((o) => o.event.start_time)).toEqual([null, '09:00'])
  })

  it('returns an empty map for no occurrences', () => {
    expect(groupOccurrencesByDate([])).toEqual(new Map())
  })
})

describe('buildMonthMatrix', () => {
  it('is a 6×7 grid of Sunday-started weeks', () => {
    const grid = buildMonthMatrix('2026-07')
    expect(grid).toHaveLength(6)
    expect(grid.every((week) => week.length === 7)).toBe(true)
    expect(grid.flat()).toHaveLength(42)
    expect(weekdayOf(grid[0][0])).toBe(0) // Sunday
  })

  it('backfills leading days from the previous month (July 1 2026 is a Wednesday)', () => {
    const grid = buildMonthMatrix('2026-07')
    expect(grid[0][0]).toBe('2026-06-28') // the Sunday before Jul 1
    expect(grid[0]).toEqual([
      '2026-06-28',
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
    ])
    expect(grid.flat()).toContain('2026-07-01')
  })

  it('starts exactly on the 1st when the month opens on a Sunday', () => {
    // March 1 2026 is a Sunday, so there are no leading days.
    const grid = buildMonthMatrix('2026-03')
    expect(grid[0][0]).toBe('2026-03-01')
    expect(weekdayOf('2026-03-01')).toBe(0)
    expect(grid[5][6]).toBe('2026-04-11') // trailing days spill into April
  })
})

describe('monthGridWindow', () => {
  it('spans the first to last cell of the month matrix (inclusive)', () => {
    expect(monthGridWindow('2026-03')).toEqual({ start: '2026-03-01', end: '2026-04-11' })
    expect(monthGridWindow('2026-07')).toEqual({ start: '2026-06-28', end: '2026-08-08' })
  })
})

describe('parseOccurrenceKey', () => {
  it('parses a valid `<uuid>:<date>` key', () => {
    const id = crypto.randomUUID()
    expect(parseOccurrenceKey(`${id}:2026-03-04`)).toEqual({ id, date: '2026-03-04' })
  })

  it('returns null for undefined', () => {
    expect(parseOccurrenceKey(undefined)).toBeNull()
  })

  it('rejects a bare uuid (no date half)', () => {
    expect(parseOccurrenceKey(crypto.randomUUID())).toBeNull()
  })

  it('rejects a bare date (no id half)', () => {
    expect(parseOccurrenceKey('2026-03-04')).toBeNull()
  })

  it('rejects a non-uuid id', () => {
    expect(parseOccurrenceKey('not-a-uuid:2026-03-04')).toBeNull()
  })

  it('rejects a malformed date', () => {
    const id = crypto.randomUUID()
    expect(parseOccurrenceKey(`${id}:2026-3-4`)).toBeNull()
    expect(parseOccurrenceKey(`${id}:`)).toBeNull()
  })

  it('splits on the FIRST colon, so trailing colons fail the date check', () => {
    const id = crypto.randomUUID()
    expect(parseOccurrenceKey(`${id}:2026-03-04:extra`)).toBeNull()
  })
})

describe('shiftMonth', () => {
  it('steps forward and backward by one month, wrapping the year', () => {
    expect(shiftMonth('2026-07', 1)).toBe('2026-08')
    expect(shiftMonth('2026-07', -1)).toBe('2026-06')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})
