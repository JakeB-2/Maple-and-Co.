// Household-wide constants. One place, imported everywhere.

export const APP_NAME = 'Maple & Co'

// Fixed UTC-5, no DST — chosen deliberately so all date math stays simple
// (see docs/decisions.md D-008). Date-only values ('YYYY-MM-DD') are always
// interpreted in this zone.
export const HOUSEHOLD_TZ = 'America/Cancun'

// Mixed-currency household. Totals are always grouped per currency and shown
// side by side; nothing ever converts between them (D-008).
export const CURRENCIES = ['MXN', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]
export const DEFAULT_CURRENCY: Currency = 'MXN'

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  MXN: '$',
  USD: 'US$',
}
