'use client'

// The one settings-list shape: a reorderable Surface of rows, each with
// move-up/move-down/edit/delete, plus a "New X" button and empty state. The
// five settings lists (categories, stores, sections, event types, attributes)
// were verbatim clones of this except for the row's lead content, the table
// name, the edit href, and labels — D-024 generalized the server-side reorder
// action but left the client list UI cloned. This absorbs it (no per-entity
// clones); callers supply only what actually differs.

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { moveSortable } from '@/lib/actions/reorder'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { Surface } from '@/components/screens/surface'
import { Button } from '@/components/ui/button'

export type SortableSettingsListProps<T extends { id: string }> = {
  items: T[]
  /** Table for both moveSortable and soft-delete (same in every settings list). */
  table: string
  /** Row content before the action buttons; include the `flex-1` element so the
   *  buttons push right (a plain lead fragment, or a Link to a sub-page). */
  renderLead: (item: T) => ReactNode
  /** Raw (pre-layer) edit href; the list layers it onto the current URL. */
  editHref: (item: T) => string
  /** Human name for a row — used in button aria-labels and the delete toast. */
  rowLabel: (item: T) => string
  /** Noun for the delete/undo toast (e.g. "Category"). */
  deleteNoun: string
  /** Rows for which delete is disabled (e.g. system_key-anchored built-ins). */
  canDelete?: (item: T) => boolean
  /** Tooltip explaining why delete is disabled, shown on non-deletable rows. */
  deleteDisabledReason?: string
  /** Label for the "New X" button. */
  newLabel: string
  /** Empty-state copy when there are no rows. */
  emptyText: string
}

export function SortableSettingsList<T extends { id: string }>({
  items,
  table,
  renderLead,
  editHref,
  rowLabel,
  deleteNoun,
  canDelete,
  deleteDisabledReason,
  newLabel,
  emptyText,
}: SortableSettingsListProps<T>) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSortable(table, id, direction)
      if (result.error) toast.error(result.error)
      else refreshNow()
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Surface className="overflow-hidden">
        <ul className="hairline-rows">
          {items.map((item, index) => {
            const busy = movingId === item.id || deletingId === item.id
            const label = rowLabel(item)
            const deletable = canDelete ? canDelete(item) : true
            return (
              <li
                key={item.id}
                className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5"
              >
                {renderLead(item)}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${label} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(item.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${label} down`}
                  disabled={busy || index === items.length - 1}
                  onClick={() => move(item.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${label}`}>
                  <Link href={layer(editHref(item))}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Delete ${label}`}
                  title={!deletable ? deleteDisabledReason : undefined}
                  disabled={busy || !deletable}
                  onClick={() => runDelete({ table, id: item.id, noun: deleteNoun, label })}
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyText}</li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> {newLabel}
        </Link>
      </Button>
    </div>
  )
}
