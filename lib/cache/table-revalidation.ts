// Table → routes registry. After a server action writes to a table, it calls
// revalidateTable() so every screen that renders that table re-fetches.
// Classic caching model (cacheComponents off, D-009): revalidatePath + the
// client router's refresh() cover read-your-own-writes for this app.
//
// Grows one entry per table as milestones land. Keep paths layout-relative
// (what appears in the URL bar).

import { revalidatePath } from 'next/cache'

const TABLE_ROUTES: Record<string, string[]> = {
  profiles: ['/'],
  // comments/reactions render inside entity detail drawers across modules
  comments: ['/', '/finance', '/groceries', '/pets/[entityId]', '/plants/[entityId]', '/calendar', '/tasks'],
  reactions: ['/', '/finance', '/groceries', '/pets/[entityId]', '/plants/[entityId]', '/calendar', '/tasks'],
  spends: ['/', '/finance'],
  spend_categories: ['/finance', '/finance/categories'],
  stores: ['/groceries', '/groceries/stores', '/groceries/stores/[storeId]', '/groceries/shop/[storeId]'],
  store_sections: ['/groceries', '/groceries/stores', '/groceries/stores/[storeId]', '/groceries/shop/[storeId]'],
  grocery_items: ['/', '/groceries', '/groceries/shop/[storeId]'],
  grocery_list_entries: ['/', '/groceries', '/groceries/shop/[storeId]'],
  grocery_item_placements: ['/groceries', '/groceries/shop/[storeId]'],
  grocery_item_prices: ['/groceries', '/groceries/shop/[storeId]'],
  entities: ['/', '/pets', '/plants', '/pets/[entityId]', '/plants/[entityId]'],
  entity_events: ['/', '/pets', '/plants', '/pets/[entityId]', '/plants/[entityId]'],
  entity_event_values: ['/', '/pets', '/plants', '/pets/[entityId]', '/plants/[entityId]'],
  // Type edits ripple into /tasks too — the task form's need picker shows type names.
  event_types: ['/', '/pets', '/plants', '/pets/[entityId]', '/plants/[entityId]', '/pets/types', '/plants/types', '/pets/types/[typeId]', '/plants/types/[typeId]', '/tasks'],
  event_type_attributes: ['/pets/[entityId]', '/plants/[entityId]', '/pets/types/[typeId]', '/plants/types/[typeId]'],
  needs: ['/', '/pets/[entityId]', '/plants/[entityId]', '/tasks'],
  calendar_events: ['/', '/calendar'],
  calendar_event_exclusions: ['/', '/calendar'],
  // Completing a need-linked task also logs an entity event → entity profiles.
  tasks: ['/', '/tasks', '/pets/[entityId]', '/plants/[entityId]'],
  task_completions: ['/', '/tasks', '/pets/[entityId]', '/plants/[entityId]'],
  household_settings: ['/', '/household'],
}

export function revalidateTable(table: keyof typeof TABLE_ROUTES | (string & {})) {
  for (const route of TABLE_ROUTES[table] ?? []) {
    // revalidatePath requires the 'page' type for paths with dynamic segments.
    revalidatePath(route, route.includes('[') ? 'page' : undefined)
  }
}
