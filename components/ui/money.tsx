// <Money /> — formats a currency amount and exposes the ISO currency code.
// Use anywhere a currency value is shown so users can disambiguate look-alike
// Intl shorthands ("MX$200" vs "$200" vs "CA$200" all share the same dollar
// glyph).
//
// Disambiguation lives in three layers (MF-062):
//   - visual: the formatted value plus a small ISO code badge next to it
//   - title: kept for sighted hover
//   - aria-label: explicit "<amount> <ISO>" so screen readers don't have to
//     parse a Intl-localised glyph
//
// Falls back to "—" when amount is null/undefined.

const DEFAULT_LOCALE = 'en-US' as const

/**
 * Formats an amount as a localized currency string (inlined from the Portal
 * currency lib — kept behavior-identical for the default locale).
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

type Props = {
  amount: number | null | undefined
  currency: string | null | undefined
  className?: string
  /**
   * Hide the inline ISO code badge — use when the parent column header or
   * an adjacent label already names the currency (e.g. on a single-currency
   * table) and the badge would just add visual noise.
   */
  hideCurrencyBadge?: boolean
  /** When set, shows after the formatted value (e.g. "(preview)"). Stays
   *  outside the tooltip-bearing span so it doesn't affect the title. */
  suffix?: React.ReactNode
}

export function Money({ amount, currency, className, hideCurrencyBadge, suffix }: Props) {
  if (amount == null || !currency) return <span className={className}>—</span>
  const formatted = formatCurrency(amount, currency)
  const ariaLabel = `${amount.toFixed(2)} ${currency}`
  return (
    <span className={className}>
      <span
        title={`${currency} ${amount.toFixed(2)}`}
        aria-label={ariaLabel}
        className="cursor-help"
      >
        {formatted}
      </span>
      {!hideCurrencyBadge && (
        <span
          aria-hidden="true"
          className="ml-1 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {currency}
        </span>
      )}
      {suffix}
    </span>
  )
}
