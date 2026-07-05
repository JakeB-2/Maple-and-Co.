'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { moveSpendCategory } from '@/lib/actions/spend-categories'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { Surface } from '@/components/screens/surface'
import { Button } from '@/components/ui/button'

export type CategoryListRow = { id: string; name: string; emoji: string; color: string }

export function CategoryList({ categories }: { categories: CategoryListRow[] }) {
  const layer = useDrawerNavHref()
  const { newHref } = useUrlRowSelection(null)
  const { refreshNow } = useMutationRefresh()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const [movingId, setMovingId] = useState<string | null>(null)

  async function move(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    try {
      const result = await moveSpendCategory(id, direction)
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
          {categories.map((category, index) => {
            const busy = movingId === category.id || deletingId === category.id
            return (
              <li key={category.id} className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-1.5">
                <span aria-hidden className="text-base">
                  {category.emoji}
                </span>
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${category.name} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(category.id, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${category.name} down`}
                  disabled={busy || index === categories.length - 1}
                  onClick={() => move(category.id, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label={`Edit ${category.name}`}>
                  <Link href={layer(`/settings/categories?edit=${category.id}`)}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Delete ${category.name}`}
                  disabled={busy}
                  onClick={() =>
                    runDelete({
                      table: 'spend_categories',
                      id: category.id,
                      noun: 'Category',
                      label: category.name,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
          {categories.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No categories yet — add the first one.
            </li>
          )}
        </ul>
      </Surface>

      <Button asChild variant="outline" className="self-start">
        <Link href={newHref()}>
          <Plus /> New category
        </Link>
      </Button>
    </div>
  )
}
