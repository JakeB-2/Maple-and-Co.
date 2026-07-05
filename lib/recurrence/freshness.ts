import type { RecurUnit } from './types'
import { addByUnit, daysBetween } from './local-date'

// Task freshness (D-017). Freshness NEVER shames: the top stage is 'due', there
// is no 'red'/'overdue' state, and the ratio is clamped so a long-neglected task
// only ever fades to fully desaturated — never alarms.
export type FreshnessStage = 'fresh' | 'aging' | 'due'

const RATIO_CAP = 1.5
const AGING_AT = 0.75
const DUE_AT = 1.0

/**
 * Freshness of an after_done-style cadence.
 *
 * period = the after_done interval length in calendar days.
 * elapsed = days from (lastDone ?? anchor) to today (never negative).
 * ratio   = elapsed / period, clamped to [0, 1.5].
 *
 * Stages: ratio < 0.75 → 'fresh'; < 1.0 → 'aging'; else 'due'.
 * dueOn = (lastDone ?? anchor) + interval × unit.
 */
export function freshness(args: {
  anchor: string
  interval: number
  unit: RecurUnit
  lastDone: string | null
  today: string
}): { ratio: number; dueOn: string; stage: FreshnessStage } {
  const base = args.lastDone ?? args.anchor
  const dueOn = addByUnit(base, args.unit, args.interval)

  const period = daysBetween(base, dueOn)
  const elapsed = daysBetween(base, args.today)

  // period is always >= 1 for interval >= 1; the guard just avoids a div-by-zero
  // if a caller ever passes a degenerate period.
  const raw = period > 0 ? elapsed / period : RATIO_CAP
  const ratio = Math.min(RATIO_CAP, Math.max(0, raw))

  const stage: FreshnessStage = ratio < AGING_AT ? 'fresh' : ratio < DUE_AT ? 'aging' : 'due'
  return { ratio, dueOn, stage }
}
