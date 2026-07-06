import { describe, expect, it } from 'vitest'
import { latestByType, recencyState } from '@/lib/queries/need-recency'
import type { NeedCadence } from '@/lib/queries/need-recency'

const NOW = new Date('2026-07-05T12:00:00Z')

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString()
}

function cadence(expect_every_hours: number | null, warn_after_hours: number | null = null): NeedCadence {
  return { expect_every_hours, warn_after_hours }
}

function ev(event_type_id: string, occurred_at: string) {
  return { event_type_id, occurred_at }
}

describe('recencyState', () => {
  it('is none when the need carries no cadence expectation (track-last-done-only, D-026)', () => {
    expect(recencyState(hoursAgo(1), cadence(null), NOW)).toBe('none')
    expect(recencyState(null, cadence(null), NOW)).toBe('none')
    // warn without expect is still no expectation.
    expect(recencyState(hoursAgo(48), cadence(null, 4), NOW)).toBe('none')
  })

  it('is overdue when a cadence exists but nothing was ever logged', () => {
    expect(recencyState(null, cadence(6), NOW)).toBe('overdue')
  })

  it('walks fresh → due → overdue across explicit boundaries', () => {
    const need = cadence(6, 10)
    expect(recencyState(hoursAgo(5.9), need, NOW)).toBe('fresh')
    expect(recencyState(hoursAgo(6), need, NOW)).toBe('due')
    expect(recencyState(hoursAgo(9.9), need, NOW)).toBe('due')
    expect(recencyState(hoursAgo(10), need, NOW)).toBe('overdue')
  })

  it('falls back to expect * 1.5 when warn_after_hours is NULL', () => {
    const need = cadence(4)
    expect(recencyState(hoursAgo(3.9), need, NOW)).toBe('fresh')
    expect(recencyState(hoursAgo(4), need, NOW)).toBe('due')
    expect(recencyState(hoursAgo(5.9), need, NOW)).toBe('due')
    expect(recencyState(hoursAgo(6), need, NOW)).toBe('overdue')
  })
})

describe('latestByType', () => {
  it('keeps the max occurred_at per type regardless of input order', () => {
    const map = latestByType([
      ev('type-feed', '2026-07-05T08:00:00Z'),
      ev('type-feed', '2026-07-05T11:00:00Z'),
      ev('type-walk', '2026-07-05T09:00:00Z'),
      ev('type-feed', '2026-07-05T06:00:00Z'),
    ])
    expect(map.get('type-feed')).toBe('2026-07-05T11:00:00Z')
    expect(map.get('type-walk')).toBe('2026-07-05T09:00:00Z')
    expect(map.size).toBe(2)
  })

  it('returns an empty map for no events', () => {
    expect(latestByType([]).size).toBe(0)
  })
})
