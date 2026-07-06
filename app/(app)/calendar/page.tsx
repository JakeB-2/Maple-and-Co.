import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import {
  fetchCalendarEvent,
  fetchCalendarEvents,
  fetchEventExclusions,
} from '@/lib/queries/calendar-events'
import {
  buildMonthMatrix,
  expandEventOccurrences,
  monthGridWindow,
  parseOccurrenceKey,
} from '@/lib/queries/calendar-window'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { PageHeader } from '@/components/shell/page-header'
import { CalendarView, MonthNav } from '@/components/calendar/calendar-view'
import { OccurrenceDetailDrawer } from '@/components/calendar/occurrence-detail-drawer'
import { EventFormBody } from '@/components/calendar/event-form-body'

export const dynamic = 'force-dynamic'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string
    selected?: string
    new?: string
    edit?: string
    day?: string
  }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  const today = todayInTimeZone(HOUSEHOLD_TZ)
  const month = params.month && MONTH_RE.test(params.month) ? params.month : today.slice(0, 7)
  const gridWindow = monthGridWindow(month)
  const occ = parseOccurrenceKey(params.selected)
  const editId = sanitizeUuidParam(params.edit)

  const [events, exclusions, profiles, selectedEvent, comments, reactions] = await Promise.all([
    fetchCalendarEvents(supabase),
    fetchEventExclusions(supabase),
    fetchProfiles(supabase),
    occ ? fetchCalendarEvent(supabase, occ.id) : null,
    occ ? fetchComments(supabase, 'calendar_event', occ.id) : [],
    occ ? fetchReactions(supabase, 'calendar_event', occ.id) : [],
  ])

  // One suppressed-date set per event — feeds both occurrence expansion here
  // and the "just this one" delete in the detail drawer.
  const exclusionsByEvent = new Map<string, Set<string>>()
  for (const exclusion of exclusions) {
    const set = exclusionsByEvent.get(exclusion.event_id)
    if (set) set.add(exclusion.occurs_on)
    else exclusionsByEvent.set(exclusion.event_id, new Set([exclusion.occurs_on]))
  }

  const matrix = buildMonthMatrix(month)
  const occurrences = expandEventOccurrences(events, exclusionsByEvent, gridWindow)

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar and Tasks are independent surfaces now (D-030, D-033) — no
          section tabs; the manage board lives at /tasks via More Actions. */}
      <PageHeader title="Calendar" subtitle="The household rhythm — what's coming up." />

      <MonthNav month={month} />
      {/* Key by month so paging resets the locally-tracked open day. */}
      <CalendarView key={month} matrix={matrix} occurrences={occurrences} month={month} today={today} />

      {occ && selectedEvent && (
        <OccurrenceDetailDrawer
          event={selectedEvent}
          date={occ.date}
          comments={comments}
          reactions={reactions}
          profiles={profiles.map(({ id, display_name, signature_color }) => ({
            id,
            display_name,
            signature_color,
          }))}
          currentUserId={user.id}
        />
      )}

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New event"
        editTitle="Edit event"
        newSize="sm"
        editSize="sm"
        newBody={<EventFormBody mode="new" />}
        editBody={editId ? <EventFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
