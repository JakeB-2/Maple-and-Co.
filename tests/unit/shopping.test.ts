import { describe, expect, it } from 'vitest'
import { groupShoppingEntries } from '@/lib/queries/shopping'
import { recentlyUsedItems } from '@/lib/queries/grocery-list'
import type { GroceryEntryRow } from '@/lib/queries/grocery-list'

const milk = { id: 'item-milk', name: 'Milk', emoji: '🥛', default_qty: null, deleted_at: null }
const eggs = { id: 'item-eggs', name: 'Eggs', emoji: '🥚', default_qty: null, deleted_at: null }
const avocado = { id: 'item-avocado', name: 'Avocado', emoji: '🥑', default_qty: null, deleted_at: null }

function entry(overrides: Partial<GroceryEntryRow>): GroceryEntryRow {
  return {
    id: crypto.randomUUID(),
    grocery_item_id: milk.id,
    qty: null,
    note: null,
    purchased_at: null,
    purchased_by_user_id: null,
    purchased_store_id: null,
    purchased_price: null,
    created_at: '2026-07-04T12:00:00Z',
    created_by_user_id: 'user-1',
    item: milk,
    ...overrides,
  }
}

const produce = { id: 'sec-produce', name: 'Produce', sort_order: 10 }
const dairy = { id: 'sec-dairy', name: 'Dairy', sort_order: 20 }

describe('groupShoppingEntries', () => {
  it('orders sections by sort_order, not input order', () => {
    const { toBuy } = groupShoppingEntries({
      entries: [
        entry({ grocery_item_id: milk.id, item: milk }),
        entry({ grocery_item_id: avocado.id, item: avocado }),
      ],
      sections: [dairy, produce],
      placements: [
        { grocery_item_id: milk.id, section_id: dairy.id },
        { grocery_item_id: avocado.id, section_id: produce.id },
      ],
    })
    expect(toBuy.map((g) => g.section?.name)).toEqual(['Produce', 'Dairy'])
  })

  it('sorts entries alphabetically by item name within a group', () => {
    const { toBuy } = groupShoppingEntries({
      entries: [
        entry({ grocery_item_id: milk.id, item: milk }),
        entry({ grocery_item_id: eggs.id, item: eggs }),
      ],
      sections: [dairy],
      placements: [
        { grocery_item_id: milk.id, section_id: dairy.id },
        { grocery_item_id: eggs.id, section_id: dairy.id },
      ],
    })
    expect(toBuy[0].entries.map((e) => e.item.name)).toEqual(['Eggs', 'Milk'])
  })

  it('puts the unplaced bucket first, and only when non-empty', () => {
    const withUnplaced = groupShoppingEntries({
      entries: [
        entry({ grocery_item_id: milk.id, item: milk }),
        entry({ grocery_item_id: avocado.id, item: avocado }),
      ],
      sections: [dairy],
      placements: [{ grocery_item_id: milk.id, section_id: dairy.id }],
    })
    expect(withUnplaced.toBuy[0].section).toBeNull()
    expect(withUnplaced.toBuy[0].entries.map((e) => e.item.name)).toEqual(['Avocado'])

    const allPlaced = groupShoppingEntries({
      entries: [entry({ grocery_item_id: milk.id, item: milk })],
      sections: [dairy],
      placements: [{ grocery_item_id: milk.id, section_id: dairy.id }],
    })
    expect(allPlaced.toBuy.map((g) => g.section?.name)).toEqual(['Dairy'])
  })

  it('treats a placement pointing at an unknown section as unplaced', () => {
    const { toBuy } = groupShoppingEntries({
      entries: [entry({ grocery_item_id: milk.id, item: milk })],
      sections: [dairy],
      placements: [{ grocery_item_id: milk.id, section_id: 'sec-gone' }],
    })
    expect(toBuy).toHaveLength(1)
    expect(toBuy[0].section).toBeNull()
  })

  it('omits sections with nothing to buy', () => {
    const { toBuy } = groupShoppingEntries({
      entries: [entry({ grocery_item_id: milk.id, item: milk })],
      sections: [produce, dairy],
      placements: [{ grocery_item_id: milk.id, section_id: dairy.id }],
    })
    expect(toBuy.map((g) => g.section?.name)).toEqual(['Dairy'])
  })

  it('collects purchased entries into the cart, newest purchase first', () => {
    const first = entry({
      grocery_item_id: milk.id,
      item: milk,
      purchased_at: '2026-07-04T15:00:00Z',
    })
    const second = entry({
      grocery_item_id: eggs.id,
      item: eggs,
      purchased_at: '2026-07-04T15:20:00Z',
    })
    const { toBuy, cart } = groupShoppingEntries({
      entries: [first, second, entry({ grocery_item_id: avocado.id, item: avocado })],
      sections: [],
      placements: [],
    })
    expect(cart.map((e) => e.id)).toEqual([second.id, first.id])
    expect(toBuy.flatMap((g) => g.entries).map((e) => e.item.name)).toEqual(['Avocado'])
  })

  it('totals only priced cart entries, in integer cents', () => {
    // 12.34 * 100 is 1233.999… in floats; toCents rounding must hold the line.
    const { totalCents } = groupShoppingEntries({
      entries: [
        entry({
          grocery_item_id: milk.id,
          item: milk,
          purchased_at: '2026-07-04T15:00:00Z',
          purchased_price: 12.34,
        }),
        entry({
          grocery_item_id: eggs.id,
          item: eggs,
          purchased_at: '2026-07-04T15:05:00Z',
          purchased_price: 0.01,
        }),
        entry({
          grocery_item_id: avocado.id,
          item: avocado,
          purchased_at: '2026-07-04T15:10:00Z',
          purchased_price: null,
        }),
      ],
      sections: [],
      placements: [],
    })
    expect(totalCents).toBe(1234 + 1)
  })
})

describe('recentlyUsedItems', () => {
  it('dedupes by item, keeping most-recent-first order', () => {
    const items = recentlyUsedItems([
      entry({ grocery_item_id: milk.id, item: milk }),
      entry({ grocery_item_id: eggs.id, item: eggs }),
      entry({ grocery_item_id: milk.id, item: milk }),
    ])
    expect(items.map((i) => i.name)).toEqual(['Milk', 'Eggs'])
  })

  it('skips deleted items', () => {
    const gone = { ...eggs, deleted_at: '2026-07-01T00:00:00Z' }
    const items = recentlyUsedItems([
      entry({ grocery_item_id: gone.id, item: gone }),
      entry({ grocery_item_id: milk.id, item: milk }),
    ])
    expect(items.map((i) => i.name)).toEqual(['Milk'])
  })

  it('caps the result at the limit', () => {
    const items = recentlyUsedItems(
      [
        entry({ grocery_item_id: milk.id, item: milk }),
        entry({ grocery_item_id: eggs.id, item: eggs }),
        entry({ grocery_item_id: avocado.id, item: avocado }),
      ],
      2
    )
    expect(items.map((i) => i.name)).toEqual(['Milk', 'Eggs'])
  })
})
