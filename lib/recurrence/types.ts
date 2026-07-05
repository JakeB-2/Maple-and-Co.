import { z } from 'zod'

// The shared recurrence contract for events and tasks. There is NO rules table
// (D-015): the rule is a small set of embedded columns. In-app we carry the
// parsed shape (RecurrenceRule); a one-off is represented as `null`, never as a
// RecurrenceRule with a null unit.

export type RecurUnit = 'day' | 'week' | 'month' | 'year'
export type RecurSemantics = 'fixed' | 'after_done'

export type RecurrenceRule = {
  unit: RecurUnit
  interval: number
  // 0=Sunday..6=Saturday; only meaningful for weekly. Empty = the anchor's own
  // weekday (see the weekly grid in next.ts).
  weekdays: number[]
  // 1..31, clamped to the month's last day; only meaningful for fixed monthly.
  monthDay: number | null
  semantics: RecurSemantics
  // Inclusive 'YYYY-MM-DD' end, or null for open-ended.
  until: string | null
}

export const recurUnitSchema = z.enum(['day', 'week', 'month', 'year'])
export const recurSemanticsSchema = z.enum(['fixed', 'after_done'])

export const recurrenceRuleSchema = z
  .object({
    unit: recurUnitSchema,
    interval: z.number().int().min(1),
    weekdays: z.array(z.number().int().min(0).max(6)),
    monthDay: z.number().int().min(1).max(31).nullable(),
    semantics: recurSemanticsSchema,
    until: z.iso.date().nullable(),
  })
  // All-or-none for the unit's required field: a fixed monthly grid is defined
  // by recur_month_day, so it must be present. (after_done ignores monthDay, and
  // weekly tolerates empty weekdays via the anchor-weekday fallback.)
  .refine((r) => !(r.semantics === 'fixed' && r.unit === 'month' && r.monthDay === null), {
    message: 'Fixed monthly recurrence requires recur_month_day',
    path: ['monthDay'],
  })

// Accepts a one-off (null) as well as a recurring rule.
export const recurrenceInputSchema = recurrenceRuleSchema.nullable()

export type RecurrenceDbColumns = {
  recur_unit: RecurUnit | null
  recur_interval: number | null
  recur_weekdays: number[] | null
  recur_month_day: number | null
  recur_semantics: RecurSemantics | null
  recur_until: string | null
}

/** In-app rule (or one-off null) → embedded DB columns (one-off = all null). */
export function toDb(rule: RecurrenceRule | null): RecurrenceDbColumns {
  if (rule === null) {
    return {
      recur_unit: null,
      recur_interval: null,
      recur_weekdays: null,
      recur_month_day: null,
      recur_semantics: null,
      recur_until: null,
    }
  }
  return {
    recur_unit: rule.unit,
    recur_interval: rule.interval,
    recur_weekdays: rule.weekdays,
    recur_month_day: rule.monthDay,
    recur_semantics: rule.semantics,
    recur_until: rule.until,
  }
}

/** Embedded DB columns → in-app rule; a null recur_unit means one-off (null). */
export function fromDb(cols: RecurrenceDbColumns): RecurrenceRule | null {
  if (cols.recur_unit === null) return null
  return {
    unit: cols.recur_unit,
    interval: cols.recur_interval ?? 1,
    weekdays: cols.recur_weekdays ?? [],
    monthDay: cols.recur_month_day,
    semantics: cols.recur_semantics ?? 'fixed',
    until: cols.recur_until,
  }
}
