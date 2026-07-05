// Per-currency, per-category totals for one month. Currencies NEVER combine
// (D-008): the UI renders one totals block per currency, side by side.
// Money math on integer centavos to dodge float drift.

import type { SpendRow } from '@/lib/queries/spends'
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/config'

export type CategoryTotal = {
  categoryId: string | null
  name: string
  emoji: string
  color: string
  cents: number
}

export type CurrencyTotals = {
  currency: Currency
  totalCents: number
  categories: CategoryTotal[]
}

const UNCATEGORIZED = { name: 'Uncategorized', emoji: '❓', color: '#8b8b8b' }

/** Decimal DB amount → integer cents. The one place the rounding rule lives. */
export function spendCents(spend: Pick<SpendRow, 'amount'>): number {
  return Math.round(spend.amount * 100)
}

/** The one-liner every list row wants: a spend's amount, formatted. */
export function formatSpendAmount(spend: Pick<SpendRow, 'amount' | 'currency'>): string {
  return formatCents(spendCents(spend), spend.currency)
}

export function monthTotals(spends: SpendRow[]): CurrencyTotals[] {
  const byCurrency = new Map<Currency, Map<string | null, CategoryTotal>>()

  for (const spend of spends) {
    const cents = spendCents(spend)
    let categories = byCurrency.get(spend.currency)
    if (!categories) {
      categories = new Map()
      byCurrency.set(spend.currency, categories)
    }
    const key = spend.category?.id ?? null
    const existing = categories.get(key)
    if (existing) {
      existing.cents += cents
    } else {
      categories.set(key, {
        categoryId: key,
        name: spend.category?.name ?? UNCATEGORIZED.name,
        emoji: spend.category?.emoji ?? UNCATEGORIZED.emoji,
        color: spend.category?.color ?? UNCATEGORIZED.color,
        cents,
      })
    }
  }

  return [...byCurrency.entries()]
    .map(([currency, categories]) => {
      // Largest first; ties break alphabetically so the order is stable
      // across renders (a tied re-shuffle reads as a glitch).
      const list = [...categories.values()].sort(
        (a, b) => b.cents - a.cents || a.name.localeCompare(b.name)
      )
      return {
        currency,
        totalCents: list.reduce((sum, c) => sum + c.cents, 0),
        categories: list,
      }
    })
    // Stable order: MXN (household default) before USD.
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

// Household convention (D-008, CURRENCY_SYMBOLS): pesos are the plain '$',
// dollars carry the disambiguating 'US$'. Intl's en-US symbols are the exact
// inverse, so format the number and prepend our own symbol.
export function formatCents(cents: number, currency: Currency): string {
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return `${CURRENCY_SYMBOLS[currency]}${amount}`
}
