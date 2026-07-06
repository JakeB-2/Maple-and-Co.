// Async server bodies for the quick-log create drawer (?new_log=<typeId>) and
// the event edit drawer (?selected&edit=<eventId>) — fetch the type, attributes
// and profiles inside the drawer's Suspense boundary, then hand plain props to
// the client EventLogForm.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import type { EntityKind } from '@/lib/queries/entities'
import { fetchEntity } from '@/lib/queries/entities'
import { fetchAttributesForType, fetchEventType } from '@/lib/queries/event-types'
import { fetchEntityEvent } from '@/lib/queries/entity-events'
import { fetchProfiles } from '@/lib/queries/profiles'
import type { ProfileRow } from '@/lib/queries/profiles'
import { entityPath } from '@/components/entities/entity-kind'
import { EventLogForm } from './event-log-form'

type EventLogFormBodyProps =
  | { mode: 'new'; typeId: string; entityId: string; kind: EntityKind }
  | { mode: 'edit'; id: string }

function toProfileChips(profiles: ProfileRow[]) {
  return profiles.map(({ id, display_name, signature_color }) => ({
    id,
    display_name,
    signature_color,
  }))
}

export async function EventLogFormBody(props: EventLogFormBodyProps) {
  const { user, supabase } = await requireAuth()

  if (props.mode === 'new') {
    const [type, attributes, profiles] = await Promise.all([
      fetchEventType(supabase, props.typeId),
      fetchAttributesForType(supabase, props.typeId),
      fetchProfiles(supabase),
    ])
    if (!type) {
      return <FormBodyNotFound noun="event type" />
    }
    return (
      <EventLogForm
        mode="new"
        entityId={props.entityId}
        kind={props.kind}
        basePath={entityPath(props.kind, props.entityId)}
        typeId={type.id}
        typeName={`${type.emoji} ${type.name}`}
        attributes={attributes}
        profiles={toProfileChips(profiles)}
        currentUserId={user.id}
        occurredAt={new Date().toISOString()}
      />
    )
  }

  const [event, profiles] = await Promise.all([
    fetchEntityEvent(supabase, props.id),
    fetchProfiles(supabase),
  ])
  if (!event) {
    return <FormBodyNotFound noun="log" />
  }
  // The edit drawer only carries the event id — resolve the owning entity for
  // the kind-aware bits (photo folder, post-save route back to its profile).
  const [entity, attributes] = await Promise.all([
    fetchEntity(supabase, event.entity_id),
    fetchAttributesForType(supabase, event.event_type_id),
  ])
  if (!entity) {
    return <FormBodyNotFound noun="log" />
  }
  return (
    <EventLogForm
      mode="edit"
      event={event}
      kind={entity.kind}
      basePath={entityPath(entity.kind, entity.id)}
      attributes={attributes}
      profiles={toProfileChips(profiles)}
      currentUserId={user.id}
    />
  )
}
