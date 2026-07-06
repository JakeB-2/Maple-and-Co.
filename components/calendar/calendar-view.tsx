'use client'

// Month grid + day agenda — the calendar screen's client island. The server
// page expands events into dated occurrences (calendar-window); this component
// only paints the 6×7 Sunday-started grid, tracks which day is open (local
// state, remounted per month via a `key`), and lists that day's occurrences.
// Selecting an occurrence opens its detail drawer through the shared
// ?selected=<id>:<date> row-selection grammar.

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDateOnlyLocal } from '@/lib/format-date'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import {
  groupOccurrencesByDate,
  shiftMonth,
  type EventOccurrence,
} from '@/lib/queries/calendar-window'
import type { CalendarEventRow } from '@/lib/queries/calendar-events'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { Surface } from '@/components/screens/surface'
import { Button } from '@/components/ui/button'

// Sunday-started single letters, matching buildMonthMatrix's grid geometry.
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const MAX_DOTS = 3

/** 'HH:MM' (24h) → a friendly 12-hour clock ('09:00' → '9:00 AM'). */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** The event's time line: 'All day', a single start, or a start–end range. */
export function formatEventTime(
  event: Pick<CalendarEventRow, 'all_day' | 'start_time' | 'end_time'>,
): string {
  if (event.all_day || !event.start_time) return 'All day'
  const start = formatClock(event.start_time)
  return event.end_time ? `${start} – ${formatClock(event.end_time)}` : start
}

// Month prev/next — layered through useDrawerNavHref so paging months keeps any
// open drawer / list state (never hand-build ?month= hrefs). Lives here beside
// CalendarView because it needs the client hook the server page can't call.
export function MonthNav({ month }: { month: string }) {
  const layer = useDrawerNavHref()
  const label = format(parseDateOnlyLocal(`${month}-01`) ?? new Date(), 'MMMM yyyy')
  return (
    <nav className="flex items-center justify-between" aria-label="Month">
      <Button asChild variant="ghost" size="icon" aria-label="Previous month">
        <Link href={layer(`/calendar?month=${shiftMonth(month, -1)}`)}>
          <ChevronLeft />
        </Link>
      </Button>
      <h2 className="text-base font-semibold">{label}</h2>
      <Button asChild variant="ghost" size="icon" aria-label="Next month">
        <Link href={layer(`/calendar?month=${shiftMonth(month, 1)}`)}>
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  )
}

export function CalendarView({
  matrix,
  occurrences,
  month,
  today,
}: {
  matrix: string[][]
  occurrences: EventOccurrence[]
  month: string
  today: string
}) {
  // Maps don't serialize across the server→client boundary, so we receive the
  // flat occurrence list and bucket it here.
  const byDate = groupOccurrencesByDate(occurrences)

  const searchParams = useSearchParams()
  const selectedKey = searchParams.get('selected')
  const { selectRow, selectedRowClassName } = useUrlRowSelection(selectedKey)

  // Open day defaults to today when it's in view, else the 1st of the month.
  const [selectedDay, setSelectedDay] = useState(
    today.slice(0, 7) === month ? today : `${month}-01`,
  )

  const dayOccurrences = byDate.get(selectedDay) ?? []
  const agendaLabel =
    selectedDay === today
      ? 'Today'
      : format(parseDateOnlyLocal(selectedDay) ?? new Date(), 'EEEE d MMM')

  return (
    <div className="flex flex-col gap-4">
      <Surface className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LETTERS.map((letter, i) => (
            <div
              key={`${letter}-${i}`}
              aria-hidden
              className="pb-1 text-center text-eyebrow text-muted-foreground"
            >
              {letter}
            </div>
          ))}

          {matrix.flat().map((date) => {
            const dayNum = Number(date.slice(8, 10))
            const inMonth = date.slice(0, 7) === month
            const isToday = date === today
            const isSelected = date === selectedDay
            const dayOccs = byDate.get(date) ?? []
            const parsed = parseDateOnlyLocal(date) ?? new Date()
            const countLabel = dayOccs.length
              ? `, ${dayOccs.length} event${dayOccs.length === 1 ? '' : 's'}`
              : ''

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDay(date)}
                aria-pressed={isSelected}
                aria-label={`${format(parsed, 'EEEE d MMMM')}${countLabel}`}
                className={cn(
                  'flex aspect-square min-h-11 flex-col items-center justify-start gap-1 rounded-md p-1 text-sm transition-colors',
                  inMonth ? 'hover:bg-surface-2' : 'text-muted-foreground/50',
                  isSelected && 'bg-primary-soft font-medium hover:bg-primary-soft',
                  isToday && 'ring-1 ring-primary ring-inset',
                )}
              >
                <span className="tabular-nums">{dayNum}</span>
                {dayOccs.length > 0 && (
                  <span className="flex items-center gap-0.5" aria-hidden>
                    {dayOccs.slice(0, MAX_DOTS).map((occ) => (
                      <span key={occ.key} className="size-1.5 rounded-full bg-primary" />
                    ))}
                    {dayOccs.length > MAX_DOTS && (
                      <span className="text-[0.625rem] leading-none text-muted-foreground">
                        +{dayOccs.length - MAX_DOTS}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Surface>

      <section className="flex flex-col gap-1.5">
        <h2 className="px-1 text-eyebrow text-muted-foreground">{agendaLabel}</h2>
        <Surface className="overflow-hidden">
          {dayOccurrences.length > 0 ? (
            <ul className="hairline-rows">
              {dayOccurrences.map((occ) => {
                const timeLabel =
                  occ.event.all_day || !occ.event.start_time
                    ? 'All day'
                    : formatClock(occ.event.start_time)
                return (
                  <li key={occ.key}>
                    <button
                      type="button"
                      onClick={() => selectRow(occ.key)}
                      className={cn(
                        'flex min-h-14 touch:min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2',
                        selectedRowClassName(occ.key),
                      )}
                    >
                      <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {timeLabel}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{occ.event.title}</span>
                        {occ.event.location && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {occ.event.location}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nothing on this day.
            </p>
          )}
        </Surface>
      </section>
    </div>
  )
}
