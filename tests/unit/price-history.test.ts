import { describe, expect, it } from 'vitest'
import { latestPriceByItem } from '@/lib/queries/price-history'
import type { PriceObservationRow } from '@/lib/queries/price-history'

function observation(overrides: Partial<PriceObservationRow>): PriceObservationRow {
  return {
    id: crypto.randomUUID(),
    grocery_item_id: 'item-milk',
    store_id: 'store-1',
    price: 45.5,
    observed_on: '2026-07-01',
    source: 'checkoff',
    created_at: '2026-07-01T12:00:00Z',
    store: { id: 'store-1', name: 'Chedraui', emoji: '🛒', currency: 'MXN' },
    ...overrides,
  }
}

describe('latestPriceByItem', () => {
  it('picks the max observed_on per item regardless of input order', () => {
    const oldest = observation({ observed_on: '2026-06-01' })
    const newest = observation({ observed_on: '2026-07-03' })
    const middle = observation({ observed_on: '2026-06-15' })

    expect(latestPriceByItem([newest, oldest, middle]).get('item-milk')?.id).toBe(newest.id)
    expect(latestPriceByItem([oldest, middle, newest]).get('item-milk')?.id).toBe(newest.id)
  })

  it('breaks an observed_on tie by later created_at', () => {
    const earlier = observation({ observed_on: '2026-07-01', created_at: '2026-07-01T09:00:00Z' })
    const later = observation({ observed_on: '2026-07-01', created_at: '2026-07-01T18:00:00Z' })

    expect(latestPriceByItem([later, earlier]).get('item-milk')?.id).toBe(later.id)
    expect(latestPriceByItem([earlier, later]).get('item-milk')?.id).toBe(later.id)
  })

  it('tracks items independently', () => {
    const milkOld = observation({ observed_on: '2026-06-01', price: 28 })
    const milkNew = observation({ observed_on: '2026-07-02', price: 30 })
    const eggs = observation({ grocery_item_id: 'item-eggs', observed_on: '2026-05-20', price: 52 })

    const latest = latestPriceByItem([eggs, milkOld, milkNew])
    expect(latest.size).toBe(2)
    expect(latest.get('item-milk')?.price).toBe(30)
    expect(latest.get('item-eggs')?.id).toBe(eggs.id)
  })

  it('returns an empty map for no observations', () => {
    expect(latestPriceByItem([]).size).toBe(0)
  })
})
