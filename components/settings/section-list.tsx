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

export type SectionListRow = { id: string; name: string }

export function SectionList({ storeId, sections }: { storeId: string; sections: SectionListRow[] }) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSortable('store_sections', id, direction)
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
          {sections.map((section, index) => {
            const busy = movingId === section.id || deletingId === section.id
            return (
              <li key={section.id} className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm">{section.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${section.name} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(section.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${section.name} down`}
                  disabled={busy || index === sections.length - 1}
                  onClick={() => move(section.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${section.name}`}>
                  <Link href={layer(`/settings/stores/${storeId}?edit=${section.id}`)}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Delete ${section.name}`}
                  disabled={busy}
                  onClick={() =>
                    runDelete({
                      table: 'store_sections',
                      id: section.id,
                      noun: 'Section',
                      label: section.name,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {sections.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No sections yet — add the first one.
            </li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> New section
        </Link>
      </Button>
    </div>
  )
}
