// Pure recency math for needs — no Supabase, unit-testable. Cadence is
// hours-based per-need now (D-032), not per event type. Staleness fades,
// never shames (D-017): states map to fading UI, not red.

import type { EntityEventRow } from '@/lib/queries/entity-events'

export type RecencyState = 'fresh' | 'due' | 'overdue' | 'none'

// The nullable cadence columns off a NeedRow. NULL expect_every_hours means
// track-last-done-only (the Meds pattern, D-026) — no state to report.
export type NeedCadence = {
  expect_every_hours: number | null
  warn_after_hours: number | null
}

// Max occurred_at per event type — makes no assumption about input sort order.
export function latestByType(
  events: Pick<EntityEventRow, 'event_type_id' | 'occurred_at'>[]
): Map<string, string> {
  const latest = new Map<string, string>()
  for (const event of events) {
    const current = latest.get(event.event_type_id)
    if (!current || event.occurred_at > current) {
      latest.set(event.event_type_id, event.occurred_at)
    }
  }
  return latest
}

export function recencyState(
  lastOccurredAt: string | null,
  cadence: NeedCadence,
  now: Date
): RecencyState {
  if (cadence.expect_every_hours === null) return 'none'
  if (!lastOccurredAt) return 'overdue'

  const hoursSince = (now.getTime() - new Date(lastOccurredAt).getTime()) / (1000 * 60 * 60)
  if (hoursSince < cadence.expect_every_hours) return 'fresh'

  const warnAfterHours = cadence.warn_after_hours ?? cadence.expect_every_hours * 1.5
  return hoursSince < warnAfterHours ? 'due' : 'overdue'
}
