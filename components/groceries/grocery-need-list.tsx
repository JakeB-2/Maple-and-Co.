'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, Plus, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { addEntryForItem, quickAddEntry } from '@/lib/actions/grocery-list'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useOptimisticList } from '@/lib/hooks/use-optimistic-list'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import {
  recentlyUsedItems,
  type GroceryEntryItem,
  type GroceryEntryRow,
} from '@/lib/queries/grocery-list'
import type { GroceryItemRow } from '@/lib/queries/grocery-catalog'
import type { StoreRow } from '@/lib/queries/stores'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { Surface } from '@/components/screens/surface'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const pillClassName =
  'inline-flex min-h-9 touch:min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors hover:bg-surface-2'

// Temp row so an in-flight add has a key — the real row (and its real sort
// position) arrives with the post-action refresh.
function optimisticEntry(item: GroceryEntryItem): GroceryEntryRow {
  return {
    id: `optimistic-${item.id}`,
    grocery_item_id: item.id,
    qty: item.default_qty,
    note: null,
    purchased_at: null,
    purchased_by_user_id: null,
    purchased_store_id: null,
    purchased_price: null,
    created_at: new Date().toISOString(),
    created_by_user_id: null,
    item,
  }
}

export function GroceryNeedList({
  entries,
  catalog,
  recentRefs,
  stores,
  selectedId,
}: {
  entries: GroceryEntryRow[]
  catalog: GroceryItemRow[]
  recentRefs: GroceryEntryRow[]
  stores: StoreRow[]
  selectedId: string | null
}) {
  const [query, setQuery] = useState('')
  const [optimisticEntries, applyOptimistic] = useOptimisticList(entries)
  const { selectRow, selectedRowClassName } = useUrlRowSelection(selectedId)
  const { refreshNow } = useMutationRefresh()
  const { runDelete } = useSoftDeleteWithUndo()
  const [, startTransition] = useTransition()

  const trimmed = query.trim()
  const entryByItemId = new Map(optimisticEntries.map((entry) => [entry.grocery_item_id, entry]))
  const matches = catalog.filter((item) =>
    item.name.toLowerCase().includes(trimmed.toLowerCase())
  )
  const hasExactMatch = catalog.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())
  const railItems = recentlyUsedItems(recentRefs, 12).filter((item) => !entryByItemId.has(item.id))

  function addItem(item: GroceryEntryItem) {
    setQuery('')
    startTransition(async () => {
      applyOptimistic({ kind: 'add', row: optimisticEntry(item) })
      const result = await addEntryForItem({ grocery_item_id: item.id })
      if (result.error) toast.error(result.error)
      else refreshNow()
    })
  }

  function quickAdd(name: string) {
    setQuery('')
    startTransition(async () => {
      applyOptimistic({
        kind: 'add',
        row: optimisticEntry({ id: name, name, emoji: '🧺', default_qty: null, deleted_at: null }),
      })
      const result = await quickAddEntry({ name })
      if (result.error) toast.error(result.error)
      else refreshNow()
    })
  }

  function removeEntry(entry: GroceryEntryRow) {
    // An in-flight add has no real row yet — nothing to delete until the
    // refresh swaps the temp id for the saved one.
    if (entry.id.startsWith('optimistic-')) return
    startTransition(async () => {
      applyOptimistic({ kind: 'remove', id: entry.id })
      await runDelete({
        table: 'grocery_list_entries',
        id: entry.id,
        noun: 'Entry',
        label: entry.item.name,
      })
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Command shouldFilter={false} className="rounded-lg border">
        <CommandInput placeholder="Add to the list…" value={query} onValueChange={setQuery} />
        {trimmed !== '' && (
          <CommandList className="max-h-56">
            <CommandGroup>
              {matches.map((item) => {
                const active = entryByItemId.get(item.id)
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => (active ? removeEntry(active) : addItem(item))}
                    className={cn(active && 'text-muted-foreground')}
                  >
                    <span aria-hidden className="text-base">
                      {item.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {active && <Check className="size-4" />}
                  </CommandItem>
                )
              })}
              {!hasExactMatch && (
                <CommandItem value={`quick-add:${trimmed}`} onSelect={() => quickAdd(trimmed)}>
                  <Plus className="size-4" />
                  <span className="min-w-0 flex-1 truncate">Add ‘{trimmed}’</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        )}
      </Command>

      {railItems.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Quick add</h2>
          <ScrollArea>
            <div className="flex gap-2 whitespace-nowrap">
              {railItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className={pillClassName}
                >
                  <span aria-hidden>{item.emoji}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {stores.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Shop</h2>
          <div className="flex flex-wrap gap-2">
            {stores.map((store) => (
              <Link key={store.id} href={`/groceries/shop/${store.id}`} className={pillClassName}>
                <span aria-hidden>{store.emoji}</span>
                <span>{store.name}</span>
                <ShoppingCart className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <h2 className="px-1 text-eyebrow text-muted-foreground">
          Need · {optimisticEntries.length}
        </h2>
        {optimisticEntries.length > 0 ? (
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {optimisticEntries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => selectRow(entry.id)}
                    className={cn(
                      'flex min-h-14 touch:min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2',
                      selectedRowClassName(entry.id)
                    )}
                  >
                    <span aria-hidden className="text-lg">
                      {entry.item.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{entry.item.name}</span>
                      {entry.note && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.note}
                        </span>
                      )}
                    </span>
                    {entry.qty && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {entry.qty}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Surface>
        ) : (
          <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
            List&apos;s empty — nothing needed. Maple approves. 🐾
          </Surface>
        )}
      </section>
    </div>
  )
}
