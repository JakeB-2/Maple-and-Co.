// Pure recency math for pet event types — no Supabase, unit-testable.
// Staleness fades, never shames (D-017): states map to fading UI, not red.

import type { PetEventTypeConfig } from '@/lib/queries/pet-event-types'
import type { PetEventRow } from '@/lib/queries/pet-events'

export type RecencyState = 'fresh' | 'due' | 'overdue' | 'none'

// Max occurred_at per event type — makes no assumption about input sort order.
export function latestByType(
  events: Pick<PetEventRow, 'event_type_id' | 'occurred_at'>[]
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
  config: PetEventTypeConfig,
  now: Date
): RecencyState {
  const expectEveryHours = config.recency?.expect_every_hours
  if (expectEveryHours === undefined) return 'none'
  if (!lastOccurredAt) return 'overdue'

  const hoursSince = (now.getTime() - new Date(lastOccurredAt).getTime()) / (1000 * 60 * 60)
  if (hoursSince < expectEveryHours) return 'fresh'

  const warnAfterHours = config.recency?.warn_after_hours ?? expectEveryHours * 1.5
  return hoursSince < warnAfterHours ? 'due' : 'overdue'
}
