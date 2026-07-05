// Per-currency month totals — one card per currency, side by side, never
// combined (D-008: no FX, ever).

import { cn } from '@/lib/utils'
import { formatCents, monthTotals } from '@/lib/queries/spend-totals'
import type { SpendRow } from '@/lib/queries/spends'
import { Surface } from '@/components/screens/surface'

const CATEGORY_ROWS_SHOWN = 4

export function TotalsCards({ spends }: { spends: SpendRow[] }) {
  const totals = monthTotals(spends)
  if (totals.length === 0) return null

  return (
    <div className={cn('grid gap-3', totals.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {totals.map((total) => (
        <Surface key={total.currency} className="p-4">
          <p className="text-eyebrow text-muted-foreground">{total.currency}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
            {formatCents(total.totalCents, total.currency)}
          </p>
          <ul className="mt-3 space-y-1">
            {total.categories.slice(0, CATEGORY_ROWS_SHOWN).map((category) => (
              <li
                key={category.categoryId ?? 'uncategorized'}
                className="flex items-baseline justify-between gap-2 text-dense text-muted-foreground"
              >
                <span className="min-w-0 truncate">
                  {category.emoji} {category.name}
                </span>
                <span className="tabular-nums">{formatCents(category.cents, total.currency)}</span>
              </li>
            ))}
            {total.categories.length > CATEGORY_ROWS_SHOWN && (
              <li className="text-dense text-muted-foreground">
                +{total.categories.length - CATEGORY_ROWS_SHOWN} more
              </li>
            )}
          </ul>
        </Surface>
      ))}
    </div>
  )
}
