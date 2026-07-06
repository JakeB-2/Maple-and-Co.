'use client'

// Recent spends as a sortable table (D-033: the month-nav list gave way to one
// newest-first table). Tapping a row opens the ?selected= detail drawer via the
// canonical URL-selection hook, same grammar as every other list.

import { formatDate } from '@/lib/format-date'
import { formatSpendAmount, spendCents } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { DataTable, type ColumnDef } from '@/components/tables/data-table'

const COLUMNS: ColumnDef<SpendRow>[] = [
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    // Same-day ties break on created_at so today's rows keep newest-on-top.
    sortValue: (spend) => `${spend.spent_on}|${spend.created_at}`,
    cell: (spend) => (
      <span className="text-sm text-muted-foreground">{formatDate(spend.spent_on)}</span>
    ),
  },
  {
    key: 'what',
    header: 'What',
    sortable: true,
    sortValue: (spend) => (spend.note ?? spend.category?.name ?? 'Spend').toLowerCase(),
    className: 'w-full',
    cell: (spend) => (
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="text-base">
          {spend.category?.emoji ?? '💸'}
        </span>
        <span className="min-w-0">
          <span className="block max-w-48 truncate text-sm sm:max-w-xs">
            {spend.note ?? spend.category?.name ?? 'Spend'}
          </span>
          {spend.note && spend.category && (
            <span className="block truncate text-xs text-muted-foreground">
              {spend.category.name}
            </span>
          )}
        </span>
      </span>
    ),
  },
  {
    key: 'who',
    header: 'Who',
    sortable: true,
    sortValue: (spend) => spend.spent_by.display_name.toLowerCase(),
    cell: (spend) => (
      <AvatarChip
        name={spend.spent_by.display_name}
        color={spend.spent_by.signature_color}
        size="sm"
      />
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortable: true,
    // Cross-currency ordering is by raw cents — good enough for eyeballing;
    // totals never mix currencies (D-008), only this sort does.
    sortValue: spendCents,
    cell: (spend) => (
      <span className="text-sm font-medium tabular-nums">{formatSpendAmount(spend)}</span>
    ),
  },
]

export function SpendTable({
  spends,
  selectedId,
}: {
  spends: SpendRow[]
  selectedId: string | null
}) {
  const { selectRow, selectedRowClassName } = useUrlRowSelection(selectedId)

  return (
    <DataTable
      columns={COLUMNS}
      rows={spends}
      rowKey={(spend) => spend.id}
      defaultSort={{ key: 'date', dir: 'desc' }}
      onRowTap={(spend) => selectRow(spend.id)}
      rowClassName={(spend) => selectedRowClassName(spend.id)}
      emptyText="Nothing logged yet. Coffee counts. ☕"
      showMoreStep={50}
    />
  )
}
