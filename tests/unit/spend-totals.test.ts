import { describe, expect, it } from 'vitest'
import { monthTotals, formatCents } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'

function spend(overrides: Partial<SpendRow>): SpendRow {
  return {
    id: crypto.randomUUID(),
    amount: 100,
    currency: 'MXN',
    spent_on: '2026-07-04',
    note: null,
    photo_path: null,
    category_id: null,
    spent_by_user_id: 'user-1',
    created_at: '2026-07-04T12:00:00Z',
    created_by_user_id: 'user-1',
    category: null,
    spent_by: { id: 'user-1', display_name: 'Jake', signature_color: '#4e7c5c' },
    ...overrides,
  }
}

const groceries = { id: 'cat-1', name: 'Groceries', emoji: '🛒', color: '#4e7c5c' }
const fun = { id: 'cat-2', name: 'Fun', emoji: '🎉', color: '#c76b98' }

describe('monthTotals', () => {
  it('never mixes currencies — one totals block each, MXN first', () => {
    const totals = monthTotals([
      spend({ amount: 100, currency: 'MXN' }),
      spend({ amount: 20, currency: 'USD' }),
      spend({ amount: 50, currency: 'MXN' }),
    ])
    expect(totals.map((t) => t.currency)).toEqual(['MXN', 'USD'])
    expect(totals[0].totalCents).toBe(150_00)
    expect(totals[1].totalCents).toBe(20_00)
  })

  it('sums in integer cents — float-hostile amounts stay exact', () => {
    // 0.1 + 0.2 !== 0.3 in floats; per-row cent rounding must hold the line.
    const totals = monthTotals([
      spend({ amount: 0.1 }),
      spend({ amount: 0.2 }),
      spend({ amount: 19.99 }),
      spend({ amount: 129.55 }),
    ])
    expect(totals[0].totalCents).toBe(10 + 20 + 1999 + 12955)
  })

  it('groups by category, largest first, uncategorized as fallback bucket', () => {
    const totals = monthTotals([
      spend({ amount: 40, category: groceries, category_id: groceries.id }),
      spend({ amount: 100, category: fun, category_id: fun.id }),
      spend({ amount: 60, category: groceries, category_id: groceries.id }),
      spend({ amount: 5 }),
    ])
    const [mxn] = totals
    expect(mxn.categories.map((c) => c.name)).toEqual(['Fun', 'Groceries', 'Uncategorized'])
    expect(mxn.categories[0].cents).toBe(100_00)
    expect(mxn.categories[1].cents).toBe(100_00)
    expect(mxn.totalCents).toBe(205_00)
  })

  it('returns empty for no spends', () => {
    expect(monthTotals([])).toEqual([])
  })
})

describe('formatCents', () => {
  it('formats MXN with plain $ and USD distinguishably', () => {
    expect(formatCents(150_00, 'MXN')).toContain('150')
    expect(formatCents(20_00, 'USD')).toContain('20')
    // The two must not render identically for the same digits (D-008: side by
    // side, never confusable).
    expect(formatCents(100_00, 'MXN')).not.toBe(formatCents(100_00, 'USD'))
  })
})
