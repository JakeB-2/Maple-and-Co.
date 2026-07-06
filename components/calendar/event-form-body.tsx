// Async server body for the calendar-event create/edit drawers — fetches the
// row for edit inside the drawer's Suspense boundary, then hands plain props to
// the client form.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchCalendarEvent } from '@/lib/queries/calendar-events'
import { fromDb } from '@/lib/recurrence/types'
import { EventForm, type EventFormDefaults } from './event-form'

export async function EventFormBody(props: { mode: 'new' } | { mode: 'edit'; id: string }) {
  const { supabase } = await requireAuth()
  const event = props.mode === 'edit' ? await fetchCalendarEvent(supabase, props.id) : null

  if (props.mode === 'edit') {
    if (!event) {
      return (
        <FormBodyNotFound noun="event" />
      )
    }
    // The six embedded recur_* columns reconstruct the rule directly (D-015).
    const defaults: EventFormDefaults = {
      title: event.title,
      all_day: event.all_day,
      start_time: event.start_time ?? '',
      end_time: event.end_time ?? '',
      starts_on: event.starts_on,
      location: event.location ?? '',
      note: event.note ?? '',
      recurrence: fromDb(event),
    }
    return <EventForm mode="edit" id={event.id} defaultValues={defaults} />
  }

  // New-event defaults: an all-day, non-repeating event today (household time).
  const defaults: EventFormDefaults = {
    title: '',
    all_day: true,
    start_time: '',
    end_time: '',
    starts_on: todayInTimeZone(HOUSEHOLD_TZ),
    location: '',
    note: '',
    recurrence: null,
  }
  return <EventForm mode="new" defaultValues={defaults} />
}
