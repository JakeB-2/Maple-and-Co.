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

export type EventTypeListRow = {
  id: string
  name: string
  emoji: string
  system_key: string | null
}

export function EventTypeList({ types }: { types: EventTypeListRow[] }) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSortable('pet_event_types', id, direction)
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
          {types.map((type, index) => {
            const busy = movingId === type.id || deletingId === type.id
            // system_key anchors analytics + task linkage on this type, so
            // built-ins can be renamed/reordered but never deleted.
            const builtIn = type.system_key !== null
            return (
              <li key={type.id} className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5">
                <Link
                  href={`/settings/pet-events/${type.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span aria-hidden className="text-base">
                    {type.emoji}
                  </span>
                  <span className="min-w-0 truncate text-sm">{type.name}</span>
                  {type.system_key && (
                    <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
                      {type.system_key}
                    </span>
                  )}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${type.name} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(type.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${type.name} down`}
                  disabled={busy || index === types.length - 1}
                  onClick={() => move(type.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${type.name}`}>
                  <Link href={layer(`/settings/pet-events?edit=${type.id}`)}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={
                    builtIn ? 'Built-in types can be renamed, not deleted.' : `Delete ${type.name}`
                  }
                  title={builtIn ? 'Built-in types can be renamed, not deleted.' : undefined}
                  disabled={busy || builtIn}
                  onClick={() =>
                    runDelete({
                      table: 'pet_event_types',
                      id: type.id,
                      noun: 'Event type',
                      label: type.name,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {types.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No event types yet — add the first one.
            </li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> New event type
        </Link>
      </Button>
    </div>
  )
}
