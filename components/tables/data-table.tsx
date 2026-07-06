'use client'

// The household data table (D-033) — a deliberately trimmed take on the
// Portal's 800-line DataTable. What survived the trim: typed column defs,
// tap-to-sort headers (one active sort, asc/desc toggle), and the ui/table
// primitives' overflow-x container. What didn't: saved views, URL-driven
// filters, pipelines, pagination machinery — two people don't need any of
// that; a 'Show more' increment covers the long tail.

import { useState } from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/screens/surface'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type SortDir = 'asc' | 'desc'

export type ColumnDef<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  sortable?: boolean
  /** Comparable value backing the sort — required for sortable columns whose
   *  cell renders a node (formatted date sorting by ISO, money by cents). */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  /** Applied to both the header and body cells of this column. */
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  onRowTap,
  rowClassName,
  emptyText = 'Nothing here yet.',
  showMoreStep,
}: {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Initial sort (e.g. newest-first on the date column). */
  defaultSort?: { key: string; dir: SortDir }
  onRowTap?: (row: T) => void
  /** Per-row class hook (e.g. the URL-selected row highlight). */
  rowClassName?: (row: T) => string | undefined
  emptyText?: string
  /** Render this many rows, with a 'Show more' button growing by the same step. */
  showMoreStep?: number
}) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const [visibleCount, setVisibleCount] = useState(showMoreStep ?? Infinity)

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  const sortCol = sort ? columns.find((col) => col.key === sort.key) : undefined
  const sorted =
    sort && sortCol?.sortValue
      ? [...rows].sort((a, b) => {
          const va = sortCol.sortValue!(a)
          const vb = sortCol.sortValue!(b)
          const cmp =
            typeof va === 'number' && typeof vb === 'number'
              ? va - vb
              : String(va).localeCompare(String(vb))
          return sort.dir === 'asc' ? cmp : -cmp
        })
      : rows
  const visible = sorted.slice(0, visibleCount)

  return (
    <div className="flex flex-col gap-2">
      <Surface>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => {
                const canSort = !!col.sortable && !!col.sortValue
                const activeDir = sort?.key === col.key ? sort.dir : null
                const headCls = cn(
                  'px-3 text-eyebrow text-muted-foreground',
                  col.align === 'right' && 'text-right',
                  col.className
                )
                return (
                  <TableHead
                    key={col.key}
                    aria-sort={
                      canSort
                        ? activeDir === 'asc'
                          ? 'ascending'
                          : activeDir === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={headCls}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          'inline-flex min-h-8 select-none items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          col.align === 'right' && 'flex-row-reverse'
                        )}
                      >
                        {col.header}
                        {activeDir === 'asc' ? (
                          <ChevronUp className="size-3" aria-hidden />
                        ) : activeDir === 'desc' ? (
                          <ChevronDown className="size-3" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="whitespace-normal px-6 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowTap ? () => onRowTap(row) : undefined}
                  onKeyDown={
                    onRowTap
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowTap(row)
                          }
                        }
                      : undefined
                  }
                  role={onRowTap ? 'button' : undefined}
                  tabIndex={onRowTap ? 0 : undefined}
                  className={cn(
                    onRowTap &&
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      // Thumb-friendly row height on touch without going airy on desktop.
                      className={cn(
                        'px-3 py-2.5 touch:py-3.5',
                        col.align === 'right' && 'text-right',
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Surface>

      {visible.length < sorted.length && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          onClick={() => setVisibleCount((count) => count + (showMoreStep ?? 0))}
        >
          Show more ({sorted.length - visible.length} left)
        </Button>
      )}
    </div>
  )
}
