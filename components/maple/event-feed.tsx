'use client'

import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { HOUSEHOLD_TZ } from '@/lib/config'
import {
  formatLocalDate,
  formatShortDate,
  parseDateOnlyLocal,
  todayInTimeZone,
} from '@/lib/format-date'
import type { PetEventAttributeRow } from '@/lib/queries/pet-event-types'
import type { PetEventRow } from '@/lib/queries/pet-events'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import type { ProfileChip } from '@/components/screens/entity-social'
import { Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { eventSummary } from '@/components/maple/event-values'

// Cancún calendar day of an instant — todayInTimeZone's injectable `now`
// makes it a general instant→day formatter (fixed UTC-5, no DST, D-008).
function dayInTz(iso: string): string {
  return todayInTimeZone(HOUSEHOLD_TZ, new Date(iso))
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  const parsedToday = parseDateOnlyLocal(today)
  if (parsedToday && formatLocalDate(subDays(parsedToday, 1)) === date) return 'Yesterday'
  return formatShortDate(date)
}

export function EventFeed({
  events,
  attributesById,
  profiles,
  selectedId,
  petName,
}: {
  events: PetEventRow[]
  attributesById: Record<string, PetEventAttributeRow>
  profiles: ProfileChip[]
  selectedId: string | null
  petName: string
}) {
  const { selectRow, selectedRowClassName } = useUrlRowSelection(selectedId)
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const today = todayInTimeZone(HOUSEHOLD_TZ)

  // Rows arrive sorted by occurred_at desc — group by Cancún day preserving
  // that order (a fixed-offset tz keeps same-day events contiguous).
  const days: { date: string; rows: PetEventRow[] }[] = []
  for (const event of events) {
    const date = dayInTz(event.occurred_at)
    const last = days[days.length - 1]
    if (last && last.date === date) last.rows.push(event)
    else days.push({ date, rows: [event] })
  }

  if (events.length === 0) {
    return (
      <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
        Nothing logged yet — {petName} awaits her biographers. 🐾
      </Surface>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">{dayLabel(day.date, today)}</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {day.rows.map((event) => {
                const doneBy = profilesById.get(event.done_by_user_id)
                const summary = eventSummary(event, attributesById)
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(event.id)}
                      className={cn(
                        'flex min-h-14 touch:min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2',
                        selectedRowClassName(event.id)
                      )}
                    >
                      <span aria-hidden className="text-lg">
                        {event.event_type.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{event.event_type.name}</span>
                        {summary && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {summary}
                          </span>
                        )}
                      </span>
                      <AvatarChip
                        name={doneBy?.display_name ?? '?'}
                        color={doneBy?.signature_color ?? '#8b8b8b'}
                        size="sm"
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(event.occurred_at), 'h:mm a')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Surface>
        </section>
      ))}
    </div>
  )
}
