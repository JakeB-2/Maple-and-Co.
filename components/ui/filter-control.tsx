'use client'

// FilterControl — a single unified filter entry point. One funnel button opens
// a popover of expandable, chevron-collapsible groups of checkable options.
// Active selections render as colour-coded removable pills to the LEFT of the
// button (group colour comes from semantic tokens). Re-toggling an option or
// clicking a pill's × removes it.
//
// Controlled: the parent owns `selected` (group key → selected values) and
// reacts to `onToggle`. This component holds no filter state of its own beyond
// which groups are visually expanded in the popover.

import * as React from 'react'
import { ListFilter, ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type FilterColor = 'primary' | 'info' | 'warning' | 'success'

export type FilterControlGroup = {
  /** Stable key used in `selected` and passed back to `onToggle`. */
  key: string
  label: string
  color: FilterColor
  options: { value: string; label: string }[]
}

// Pill fill/text from semantic tokens. Primary uses the soft-tint pair; the
// other colours expose a matching `-bg` token.
function pillStyle(color: FilterColor): React.CSSProperties {
  if (color === 'primary') {
    return { backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }
  }
  return { backgroundColor: `var(--color-${color}-bg)`, color: `var(--color-${color})` }
}

export function FilterControl({
  groups,
  selected,
  onToggle,
  className,
}: {
  groups: FilterControlGroup[]
  selected: Record<string, string[]>
  onToggle: (groupKey: string, value: string) => void
  className?: string
}) {
  const activeCount = Object.values(selected).reduce((n, v) => n + (v?.length ?? 0), 0)

  const pills = groups.flatMap((g) =>
    (selected[g.key] ?? []).map((value) => ({
      groupKey: g.key,
      value,
      label: g.options.find((o) => o.value === value)?.label ?? value,
      color: g.color,
    })),
  )

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {pills.map((p) => (
        <button
          key={`${p.groupKey}:${p.value}`}
          type="button"
          onClick={() => onToggle(p.groupKey, p.value)}
          style={pillStyle(p.color)}
          className="inline-flex h-8 touch:h-9 max-w-[12rem] items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          aria-label={`Remove filter ${p.label}`}
        >
          <span className="truncate">{p.label}</span>
          <X className="size-3.5 shrink-0 opacity-70" />
        </button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 touch:h-9 gap-1.5">
            <ListFilter className="size-3.5 opacity-60" />
            Filter
            {activeCount > 0 && (
              <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <FilterGroups groups={groups} selected={selected} onToggle={onToggle} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function FilterGroups({
  groups,
  selected,
  onToggle,
}: {
  groups: FilterControlGroup[]
  selected: Record<string, string[]>
  onToggle: (groupKey: string, value: string) => void
}) {
  // Default-expand groups that already have an active selection so the user
  // lands on what they last touched; everything else starts collapsed.
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) init[g.key] = (selected[g.key]?.length ?? 0) > 0
    return init
  })

  return (
    <div className="max-h-[22rem] overflow-y-auto py-1">
      {groups.map((g) => {
        const open = expanded[g.key]
        const count = selected[g.key]?.length ?? 0
        const sel = selected[g.key] ?? []
        return (
          <div key={g.key} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
              aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40"
            >
              <ChevronDown
                className={cn('size-4 text-muted-foreground transition-transform', !open && '-rotate-90')}
                aria-hidden
              />
              <span className="flex-1 text-left">{g.label}</span>
              {count > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
            {open && (
              <ul className="pb-1">
                {g.options.length === 0 ? (
                  <li className="py-1.5 pl-9 pr-3 text-xs text-muted-foreground">No options</li>
                ) : (
                  g.options.map((o) => {
                    const on = sel.includes(o.value)
                    return (
                      <li key={o.value}>
                        <button
                          type="button"
                          onClick={() => onToggle(g.key, o.value)}
                          aria-pressed={on}
                          className="flex w-full items-center gap-2 py-1.5 pl-9 pr-3 text-sm transition-colors hover:bg-muted/40"
                        >
                          <span
                            className={cn(
                              'grid size-4 shrink-0 place-items-center rounded-[4px] border',
                              on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                            )}
                          >
                            {on && <Check className="size-3" />}
                          </span>
                          <span className="flex-1 truncate text-left">{o.label}</span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
