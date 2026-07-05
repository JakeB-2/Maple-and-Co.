// Shopping-mode grouping — pure TS, no supabase (unit-tested). Placements map
// items into a store's sections; anything unplaced leads the list so it gets
// sorted on the next trip.

import type { GroceryEntryRow } from '@/lib/queries/grocery-list'
import { toCents } from '@/lib/queries/spend-totals'

export type ShoppingSection = { id: string; name: string; sort_order: number }
export type ShoppingSectionGroup = { section: ShoppingSection | null; entries: GroceryEntryRow[] }

function byItemName(a: GroceryEntryRow, b: GroceryEntryRow): number {
  return a.item.name.localeCompare(b.item.name)
}

export function groupShoppingEntries(args: {
  entries: GroceryEntryRow[]
  sections: ShoppingSection[]
  placements: { grocery_item_id: string; section_id: string }[]
}): { toBuy: ShoppingSectionGroup[]; cart: GroceryEntryRow[]; totalCents: number } {
  const { entries, sections, placements } = args

  const sectionIds = new Set(sections.map((section) => section.id))
  const sectionIdByItem = new Map<string, string>()
  for (const placement of placements) {
    // A placement pointing at a section that no longer exists counts as unplaced.
    if (sectionIds.has(placement.section_id)) {
      sectionIdByItem.set(placement.grocery_item_id, placement.section_id)
    }
  }

  const unplaced: GroceryEntryRow[] = []
  const bySection = new Map<string, GroceryEntryRow[]>()
  const cart: GroceryEntryRow[] = []
  for (const entry of entries) {
    if (entry.purchased_at !== null) {
      cart.push(entry)
      continue
    }
    const sectionId = sectionIdByItem.get(entry.grocery_item_id)
    if (sectionId === undefined) {
      unplaced.push(entry)
      continue
    }
    const group = bySection.get(sectionId)
    if (group) group.push(entry)
    else bySection.set(sectionId, [entry])
  }

  const toBuy: ShoppingSectionGroup[] = []
  if (unplaced.length > 0) {
    toBuy.push({ section: null, entries: unplaced.sort(byItemName) })
  }
  const orderedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order)
  for (const section of orderedSections) {
    const group = bySection.get(section.id)
    if (group) toBuy.push({ section, entries: group.sort(byItemName) })
  }

  cart.sort((a, b) => (b.purchased_at ?? '').localeCompare(a.purchased_at ?? ''))

  let totalCents = 0
  for (const entry of cart) {
    if (entry.purchased_price !== null) totalCents += toCents(entry.purchased_price)
  }

  return { toBuy, cart, totalCents }
}
