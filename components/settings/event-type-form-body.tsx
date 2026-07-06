// Async server bodies for the event-type create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchPetEventTypes, typeConfig } from '@/lib/queries/pet-event-types'
import { EventTypeForm, type EventTypeFormDefaults } from './event-type-form'

type EventTypeFormBodyProps = { mode: 'new' } | { mode: 'edit'; id: string }

export async function EventTypeFormBody(props: EventTypeFormBodyProps) {
  const { supabase } = await requireAuth()
  const types = await fetchPetEventTypes(supabase)

  if (props.mode === 'edit') {
    const row = types.find((type) => type.id === props.id)
    if (!row) {
      return (
        <FormBodyNotFound noun="event type" />
      )
    }
    const config = typeConfig(row)
    const defaults: EventTypeFormDefaults = {
      name: row.name,
      emoji: row.emoji,
      sort_order: row.sort_order,
      show_on_today: config.show_on_today ?? false,
      expect_every_hours: config.recency?.expect_every_hours ?? null,
      warn_after_hours: config.recency?.warn_after_hours ?? null,
    }
    return <EventTypeForm mode="edit" id={row.id} defaultValues={defaults} />
  }

  const nextSortOrder = types.length > 0 ? Math.max(...types.map((t) => t.sort_order)) + 1 : 0
  const defaults: EventTypeFormDefaults = {
    name: '',
    emoji: '',
    sort_order: nextSortOrder,
    show_on_today: false,
    expect_every_hours: null,
    warn_after_hours: null,
  }
  return <EventTypeForm mode="new" defaultValues={defaults} />
}
