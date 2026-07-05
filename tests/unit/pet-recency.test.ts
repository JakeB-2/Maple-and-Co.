import { describe, expect, it } from 'vitest'
import { latestByType, recencyState } from '@/lib/queries/pet-recency'
import type { PetEventTypeConfig } from '@/lib/queries/pet-event-types'

const NOW = new Date('2026-07-05T12:00:00Z')

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString()
}

function cadence(expect_every_hours: number, warn_after_hours?: number): PetEventTypeConfig {
  return { recency: { expect_every_hours, warn_after_hours } }
}

function ev(event_type_id: string, occurred_at: string) {
  return { event_type_id, occurred_at }
}

describe('recencyState', () => {
  it('is none when the type carries no cadence expectation', () => {
    expect(recencyState(hoursAgo(1), {}, NOW)).toBe('none')
    expect(recencyState(null, {}, NOW)).toBe('none')
    // A recency block without expect_every_hours is still no expectation.
    expect(recencyState(hoursAgo(48), { recency: { warn_after_hours: 4 } }, NOW)).toBe('none')
  })

  it('is overdue when a cadence exists but nothing was ever logged', () => {
    expect(recencyState(null, cadence(6), NOW)).toBe('overdue')
  })

  it('walks fresh → due → overdue across explicit boundaries', () => {
    const config = cadence(6, 10)
    expect(recencyState(hoursAgo(5.9), config, NOW)).toBe('fresh')
    expect(recencyState(hoursAgo(6), config, NOW)).toBe('due')
    expect(recencyState(hoursAgo(9.9), config, NOW)).toBe('due')
    expect(recencyState(hoursAgo(10), config, NOW)).toBe('overdue')
  })

  it('falls back to expect * 1.5 when warn_after_hours is unset', () => {
    const config = cadence(4)
    expect(recencyState(hoursAgo(3.9), config, NOW)).toBe('fresh')
    expect(recencyState(hoursAgo(4), config, NOW)).toBe('due')
    expect(recencyState(hoursAgo(5.9), config, NOW)).toBe('due')
    expect(recencyState(hoursAgo(6), config, NOW)).toBe('overdue')
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
