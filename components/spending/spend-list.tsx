'use client'

import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseDateOnlyLocal } from '@/lib/format-date'
import { formatSpendAmount } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  const parsedToday = parseDateOnlyLocal(today)
  if (parsedToday && formatLocalDate(subDays(parsedToday, 1)) === date) return 'Yesterday'
  const parsed = parseDateOnlyLocal(date)
  return parsed ? format(parsed, 'EEEE d MMM') : date
}

export function SpendList({
  spends,
  selectedId,
  today,
}: {
  spends: SpendRow[]
  selectedId: string | null
  today: string
}) {
  const { selectRow, selectedRowClassName, newHref } = useUrlRowSelection(selectedId)

  // Rows arrive sorted by spent_on desc — group them preserving that order.
  const days: { date: string; rows: SpendRow[] }[] = []
  for (const spend of spends) {
    const last = days[days.length - 1]
    if (last && last.date === spend.spent_on) last.rows.push(spend)
    else days.push({ date: spend.spent_on, rows: [spend] })
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">{dayLabel(day.date, today)}</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {day.rows.map((spend) => (
                <li key={spend.id}>
                  <button
                    type="button"
                    onClick={() => selectRow(spend.id)}
                    className={cn(
                      'flex min-h-14 touch:min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2',
                      selectedRowClassName(spend.id)
                    )}
                  >
                    <AvatarChip
                      name={spend.spent_by.display_name}
                      color={spend.spent_by.signature_color}
                      size="sm"
                    />
                    <span aria-hidden className="text-base">
                      {spend.category?.emoji ?? '💸'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {spend.note ?? spend.category?.name ?? 'Spend'}
                      </span>
                      {spend.note && spend.category && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {spend.category.name}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatSpendAmount(spend)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      ))}

      {spends.length === 0 && (
        <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
          Nothing logged this month yet. Coffee counts. ☕
        </Surface>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-lg justify-end px-4">
        <Button
          asChild
          size="lg"
          className="pointer-events-auto rounded-full shadow-lg"
          aria-label="Log a spend"
        >
          <Link href={newHref()}>
            <Plus /> Log spend
          </Link>
        </Button>
      </div>
    </div>
  )
}
