// Table → routes registry. After a server action writes to a table, it calls
// revalidateTable() so every screen that renders that table re-fetches.
// Classic caching model (cacheComponents off, D-009): revalidatePath + the
// client router's refresh() cover read-your-own-writes for this app.
//
// Grows one entry per table as milestones land. Keep paths layout-relative
// (what appears in the URL bar).

import { revalidatePath } from 'next/cache'

const TABLE_ROUTES: Record<string, string[]> = {
  profiles: ['/', '/settings'],
  comments: ['/', '/spending', '/groceries'], // comments render inside entity detail drawers
  reactions: ['/', '/spending', '/groceries'],
  spends: ['/', '/spending'],
  spend_categories: ['/spending', '/settings/categories'],
  stores: ['/groceries', '/settings/stores'],
  store_sections: ['/groceries', '/settings/stores'],
  grocery_items: ['/', '/groceries'],
  grocery_list_entries: ['/', '/groceries'],
  grocery_item_placements: ['/groceries'],
  grocery_item_prices: ['/groceries'],
}

export function revalidateTable(table: keyof typeof TABLE_ROUTES | (string & {})) {
  for (const route of TABLE_ROUTES[table] ?? []) {
    revalidatePath(route)
  }
}
