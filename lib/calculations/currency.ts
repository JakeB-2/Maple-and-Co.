/**
 * Functional currency for the household. Money math and client-side previews
 * use this synchronous constant as the default/fallback currency.
 */
export const FUNCTIONAL_CURRENCY = 'USD' as const

/**
 * Default BCP-47 locale for the money/quantity formatters. Callers can pass an
 * explicit `locale` argument; this default preserves 'en-US' formatting when
 * none is supplied (behavior-neutral).
 * NOTE: date formatting is deliberately NOT locale-driven — the ISO YYYY-MM-DD
 * helpers in lib/format-date.ts stay load-bearing.
 */
export const DEFAULT_LOCALE = 'en-US' as const

/**
 * Converts an amount from one currency to another using a pre-fetched rate.
 * rate = 1 fromCurrency → rate toCurrency (e.g. USD→MXN rate of 17 means 1 USD = 17 MXN)
 */
export function convertCurrency(amount: number, rate: number): number {
  return amount * rate
}

/**
 * Rounds a currency amount to 2 decimal places using the same half-away-from-zero
 * behavior as PostgreSQL `round(numeric, 2)`.
 *
 * Throws on non-finite input. A `NaN` or `Infinity` here would propagate
 * silently into downstream money writes and later read back as 0 or break
 * aggregates with no signal — fail loud is the correct trade-off for a
 * financial primitive.
 *
 * A previous `+ Number.EPSILON` nudge diverged from PG on ~5.9% of exact
 * half-cents above |x| ≈ 2 (e.g. 2.005 → 2.00 instead of 2.01) because a
 * fixed epsilon is too small once the value's own ULP exceeds it. Normalizing
 * `abs(x) * 100` to 15 significant digits collapses the float-representation
 * error of the ×100 scaling so the half lands on the correct side, matching
 * `round(numeric, 2)` across the tested range.
 */
export function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`roundCurrency: non-finite input (${amount})`)
  }
  const scaled = Number((Math.abs(amount) * 100).toPrecision(15))
  const rounded = (Math.sign(amount) * Math.round(scaled)) / 100
  return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * Floors a currency amount to 2 decimal places.
 *
 * Use this for "fill up to available" affordances where rounding up by a cent
 * would exceed the source balance. It has the same fail-loud non-finite
 * contract as roundCurrency.
 *
 * Like roundCurrency, it normalizes `abs(x) * 100` to 15 significant digits
 * before flooring: the naive `Math.floor(x * 100) / 100` drops a cent on exact
 * 2dp inputs above |x| ≈ 2 (e.g. `2.01 * 100` is stored as 200.99999…, so
 * `Math.floor` → 200 → 2.00) — a real bug for residual/fill call sites.
 *
 * Negative inputs floor by MAGNITUDE (toward zero): floorCurrency(-2.019) ===
 * -2.01, mirroring the sign-then-floor structure of roundCurrency. Call sites
 * should feed positive "fill up to available" / residual amounts (they
 * short-circuit on `<= 0`), so the negative branch is contract, not behavior
 * anyone relies on today.
 */
export function floorCurrency(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`floorCurrency: non-finite input (${amount})`)
  }
  const scaled = Number((Math.abs(amount) * 100).toPrecision(15))
  const floored = (Math.sign(amount) * Math.floor(scaled)) / 100
  return Object.is(floored, -0) ? 0 : floored
}

/**
 * Formats an amount as a currency string (e.g. "$1,234.56").
 *
 * `locale` defaults to `DEFAULT_LOCALE` ('en-US') so existing call sites are
 * behavior-neutral; pass an explicit locale for anything else.
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
