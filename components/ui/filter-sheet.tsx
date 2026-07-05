'use client'

// FilterSheet — grouped multi-select filter UI used by DataTable in place of
// inline per-filter dropdowns. One button opens the sheet; the sheet renders
// each filter group as an uppercase eyebrow + a wrap-flex of pill buttons.
// Date-range groups render as two date inputs (from / to). Apply commits the
// staged selections, Clear wipes them all.
//
// Stays controlled: the parent owns active state via URL/searchParams. The
// sheet stages edits internally so closing without "Apply" discards changes.

import { useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export type FilterGroupConfig = {
  /** Stable key used in the URL searchParams + as the React key. */
  key: string
  /** Visible group label (used as the section header). */
  label: string
  options: { value: string; label: string }[]
}

export type DateRangeGroupConfig = {
  key: string
  label: string
}

export type DateRangeValue = { from: string | null; to: string | null }

type Props = {
  groups: FilterGroupConfig[]
  dateRangeGroups?: DateRangeGroupConfig[]
  /** Map of key → selected option values. */
  active: Record<string, string[]>
  activeDateRanges?: Record<string, DateRangeValue>
  /** Replace the full active maps in one go. */
  onChange: (
    nextFacets: Record<string, string[]>,
    nextDateRanges: Record<string, DateRangeValue>,
  ) => void
  /** Override the default trigger label. */
  triggerLabel?: string
  className?: string
}

export function FilterSheet({
  groups,
  dateRangeGroups = [],
  active,
  activeDateRanges = {},
  onChange,
  triggerLabel = 'Filters',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  // Match the app-wide mobile convention (FormDrawer / WorkEntryEditorSheet):
  // bottom sheet below md, right drawer at md+. One change here flows to every
  // DataTable filter button since FilterSheet is the single shared component.
  const isWide = useMediaQuery('(min-width: 768px)')
  const side = isWide ? 'right' : 'bottom'

  const facetActiveCount = Object.values(active).reduce((sum, vals) => sum + vals.length, 0)
  const rangeActiveCount = Object.values(activeDateRanges).filter((r) => r.from || r.to).length
  const totalActive = facetActiveCount + rangeActiveCount

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Icon-only below md so the toolbar doesn't burn a full label's worth
            of width on narrow screens; the label returns on the desktop table. */}
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-1.5 shrink-0', className)}
          aria-label={typeof triggerLabel === 'string' ? triggerLabel : 'Filters'}
        >
          <ListFilter className="size-3.5 opacity-60" />
          <span className="hidden md:inline">{triggerLabel}</span>
          {totalActive > 0 && (
            <span className="size-5 rounded-full bg-primary text-primary-foreground text-[0.625rem] grid place-items-center font-semibold md:ml-0.5">
              {totalActive}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        className={cn(
          'flex flex-col p-0',
          isWide
            ? 'w-full sm:max-w-md'
            : 'data-[side=bottom]:max-h-[88dvh] data-[side=bottom]:rounded-t-xl',
        )}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Adjust table filters before applying them to the current list.
          </SheetDescription>
        </SheetHeader>

        {/* Body is keyed on `open` so closing+reopening remounts it with
            fresh staged state initialized from the latest active/range
            props. Avoids the previous setState-in-useEffect re-sync. */}
        {open && (
          <FilterSheetBody
            key={`${facetActiveCount}-${rangeActiveCount}`}
            groups={groups}
            dateRangeGroups={dateRangeGroups}
            initialFacets={active}
            initialDateRanges={activeDateRanges}
            onApply={(facets, ranges) => {
              onChange(facets, ranges)
              setOpen(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function FilterSheetBody({
  groups,
  dateRangeGroups,
  initialFacets,
  initialDateRanges,
  onApply,
}: {
  groups: FilterGroupConfig[]
  dateRangeGroups: DateRangeGroupConfig[]
  initialFacets: Record<string, string[]>
  initialDateRanges: Record<string, DateRangeValue>
  onApply: (
    facets: Record<string, string[]>,
    ranges: Record<string, DateRangeValue>,
  ) => void
}) {
  // Lazy initial state from the props captured at mount; the parent remounts
  // this component (via the keyed render above) whenever the sheet reopens
  // so a fresh stage is captured from the latest URL/searchParams.
  const [staged, setStaged] = useState<Record<string, string[]>>(initialFacets)
  const [stagedRanges, setStagedRanges] = useState<Record<string, DateRangeValue>>(initialDateRanges)

  function toggle(key: string, value: string) {
    setStaged((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  function setRange(key: string, side: 'from' | 'to', value: string) {
    setStagedRanges((prev) => ({
      ...prev,
      [key]: { from: prev[key]?.from ?? null, to: prev[key]?.to ?? null, [side]: value || null },
    }))
  }

  function clearAll() {
    setStaged({})
    setStagedRanges({})
  }

  function apply() {
    const cleanedFacets: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(staged)) {
      if (v.length > 0) cleanedFacets[k] = v
    }
    const cleanedRanges: Record<string, DateRangeValue> = {}
    for (const [k, v] of Object.entries(stagedRanges)) {
      if (v.from || v.to) cleanedRanges[k] = v
    }
    onApply(cleanedFacets, cleanedRanges)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {groups.length === 0 && dateRangeGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">No filters available.</p>
        )}
        {dateRangeGroups.map((group) => {
          const range = stagedRanges[group.key] ?? { from: null, to: null }
          return (
            <div key={group.key} className="space-y-2">
              <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-muted-foreground mb-1">From</label>
                  <Input
                    type="date"
                    value={range.from ?? ''}
                    onChange={(e) => setRange(group.key, 'from', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-micro text-muted-foreground mb-1">To</label>
                  <Input
                    type="date"
                    value={range.to ?? ''}
                    onChange={(e) => setRange(group.key, 'to', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}
        {groups.map((group) => {
          const selected = staged[group.key] ?? []
          return (
            <div key={group.key} className="space-y-2">
              <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((opt) => {
                  const isOn = selected.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggle(group.key, opt.value)}
                      className={cn(
                        'h-9 px-3 rounded-md border text-sm transition-colors',
                        isOn
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card hover:bg-muted/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <SheetFooter className="border-t flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-10"
          onClick={clearAll}
        >
          Clear
        </Button>
        <Button
          type="button"
          className="flex-[2] h-10"
          onClick={apply}
        >
          Apply filters
        </Button>
      </SheetFooter>
    </>
  )
}

// ---------------------------------------------------------------------------
// FilterChipRow — horizontal-scroll row of removable chips for active filters
// ---------------------------------------------------------------------------

type Chip = { key: string; value: string; label: string }

export function FilterChipRow({
  chips,
  onRemove,
}: {
  chips: Chip[]
  onRemove: (key: string, value: string) => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 no-scrollbar">
      {chips.map((c) => (
        <button
          key={`${c.key}|${c.value}`}
          type="button"
          onClick={() => onRemove(c.key, c.value)}
          className="h-7 touch:h-9 px-2.5 rounded-full border bg-card text-meta flex items-center gap-1 shrink-0 hover:bg-muted/40"
        >
          {c.label}
          <X className="size-3" />
        </button>
      ))}
    </div>
  )
}
