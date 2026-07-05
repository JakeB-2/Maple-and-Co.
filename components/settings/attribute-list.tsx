'use client'

import { useState } from 'react'
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
import { VALUE_KIND_LABELS, type ValueKind } from './attribute-form'

export type AttributeListRow = {
  id: string
  label: string
  value_kind: string
  unit: string | null
  required: boolean
  system_key: string | null
}

export function AttributeList({
  typeId,
  attributes,
}: {
  typeId: string
  attributes: AttributeListRow[]
}) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSortable('pet_event_attributes', id, direction)
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
          {attributes.map((attribute, index) => {
            const busy = movingId === attribute.id || deletingId === attribute.id
            const kindLabel = VALUE_KIND_LABELS[attribute.value_kind as ValueKind] ?? attribute.value_kind
            // system_key attributes anchor analytics (e.g. the weight sparkline)
            // and can never be recreated from the UI — deleting is disabled.
            const anchored = attribute.system_key !== null
            return (
              <li key={attribute.id} className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="min-w-0 truncate text-sm">{attribute.label}</span>
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
                    {kindLabel}
                  </span>
                  {attribute.unit && (
                    <span className="shrink-0 text-xs text-muted-foreground">{attribute.unit}</span>
                  )}
                  {attribute.required && (
                    <span title="Required" className="size-1.5 shrink-0 rounded-full bg-primary">
                      <span className="sr-only">Required</span>
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${attribute.label} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(attribute.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${attribute.label} down`}
                  disabled={busy || index === attributes.length - 1}
                  onClick={() => move(attribute.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${attribute.label}`}>
                  <Link href={layer(`/settings/pet-events/${typeId}?edit=${attribute.id}`)}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Delete ${attribute.label}`}
                  title={anchored ? 'Built-in fields power charts and can’t be deleted.' : undefined}
                  disabled={busy || anchored}
                  onClick={() =>
                    runDelete({
                      table: 'pet_event_attributes',
                      id: attribute.id,
                      noun: 'Attribute',
                      label: attribute.label,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {attributes.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No fields yet — add the first one.
            </li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> New attribute
        </Link>
      </Button>
    </div>
  )
}
