import type { RecurrenceRule } from './types'
import { addDays, compareDates } from './local-date'
import { nextOccurrence } from './next'

// A month view never needs anywhere near this many occurrences; the cap only
// bounds a pathological loop (e.g. daily over a huge window). Hitting it just
// stops early, which is acceptable per D-015/D-016.
const MAX_OCCURRENCES = 366

/**
 * All occurrences within [window.start, window.end] INCLUSIVE, sorted
 * ascending, honoring `until` and minus `exclusions` (D-016).
 *
 * FIXED only expands into a grid. For AFTER_DONE there is exactly one projected
 * due date — `(anchor) + interval × unit`, since expansion has no completion
 * context — and it is returned only if it falls inside the window. So an
 * after_done rule yields at most one date, never a grid.
 */
export function expandOccurrences(
  rule: RecurrenceRule,
  anchor: string,
  window: { start: string; end: string },
  exclusions?: Iterable<string>
): string[] {
  const excluded = new Set(exclusions ?? [])

  if (rule.semantics === 'after_done') {
    // `after` is ignored for after_done, so any value gives the single projection.
    const due = nextOccurrence(rule, anchor, anchor, null)
    if (
      due !== null &&
      compareDates(due, window.start) >= 0 &&
      compareDates(due, window.end) <= 0 &&
      !excluded.has(due)
    ) {
      return [due]
    }
    return []
  }

  const occurrences: string[] = []
  // Seed one day before the window so an occurrence exactly on window.start is
  // the first strictly-after result (window edges are inclusive).
  let cursor = addDays(window.start, -1)
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    const occ = nextOccurrence(rule, anchor, cursor, null)
    if (occ === null || compareDates(occ, window.end) > 0) break
    if (!excluded.has(occ)) occurrences.push(occ)
    cursor = occ
  }
  return occurrences
}
