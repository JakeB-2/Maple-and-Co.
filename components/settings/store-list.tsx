'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { moveSortable } from '@/lib/actions/reorder'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { Surface } from '@/components/screens/surface'
import { Button } from '@/components/ui/button'

export type StoreListRow = { id: string; name: string; emoji: string; currency: string }

export function StoreList({ stores }: { stores: StoreListRow[] }) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSortable('stores', id, direction)
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
          {stores.map((store, index) => {
            const busy = movingId === store.id || deletingId === store.id
            return (
              <li key={store.id} className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5">
                <Link
                  href={`/settings/stores/${store.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span aria-hidden className="text-base">
                    {store.emoji}
                  </span>
                  <span className="min-w-0 truncate text-sm">{store.name}</span>
                  <span className="text-xs text-muted-foreground">{store.currency}</span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${store.name} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(store.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${store.name} down`}
                  disabled={busy || index === stores.length - 1}
                  onClick={() => move(store.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${store.name}`}>
                  <Link href={layer(`/settings/stores?edit=${store.id}`)}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Delete ${store.name}`}
                  disabled={busy}
                  onClick={() =>
                    runDelete({
                      table: 'stores',
                      id: store.id,
                      noun: 'Store',
                      label: store.name,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {stores.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No stores yet — add the first one.
            </li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> New store
        </Link>
      </Button>
    </div>
  )
}
