// Async server bodies for the event-type create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import type { EntityKind } from '@/lib/queries/entities'
import { fetchEventTypes } from '@/lib/queries/event-types'
import { EventTypeForm, type EventTypeFormDefaults } from './event-type-form'

type EventTypeFormBodyProps = { kind: EntityKind } & ({ mode: 'new' } | { mode: 'edit'; id: string })

export async function EventTypeFormBody(props: EventTypeFormBodyProps) {
  const { supabase } = await requireAuth()
  const types = await fetchEventTypes(supabase, props.kind)

  if (props.mode === 'edit') {
    const row = types.find((type) => type.id === props.id)
    if (!row) {
      return <FormBodyNotFound noun="event type" />
    }
    const defaults: EventTypeFormDefaults = {
      name: row.name,
      emoji: row.emoji,
      sort_order: row.sort_order,
    }
    return <EventTypeForm mode="edit" kind={props.kind} id={row.id} defaultValues={defaults} />
  }

  const nextSortOrder = types.length > 0 ? Math.max(...types.map((t) => t.sort_order)) + 1 : 0
  const defaults: EventTypeFormDefaults = {
    name: '',
    emoji: '',
    sort_order: nextSortOrder,
  }
  return <EventTypeForm mode="new" kind={props.kind} defaultValues={defaults} />
}
