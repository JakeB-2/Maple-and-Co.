// Async server bodies for the quick-log create drawer (?log=<typeId>) and the
// event edit drawer (?selected&edit=<eventId>) — fetch the type, attributes
// and profiles inside the drawer's Suspense boundary, then hand plain props to
// the client EventLogForm.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchAttributesForType, fetchPetEventType } from '@/lib/queries/pet-event-types'
import { fetchPetEvent } from '@/lib/queries/pet-events'
import { fetchProfiles } from '@/lib/queries/profiles'
import type { ProfileRow } from '@/lib/queries/profiles'
import { EventLogForm } from './event-log-form'

type EventLogFormBodyProps =
  | { mode: 'new'; typeId: string; petId: string }
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
      fetchPetEventType(supabase, props.typeId),
      fetchAttributesForType(supabase, props.typeId),
      fetchProfiles(supabase),
    ])
    if (!type) {
      return <FormBodyNotFound noun="event type" />
    }
    return (
      <EventLogForm
        mode="new"
        petId={props.petId}
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
    fetchPetEvent(supabase, props.id),
    fetchProfiles(supabase),
  ])
  if (!event) {
    return <FormBodyNotFound noun="log" />
  }
  const attributes = await fetchAttributesForType(supabase, event.event_type_id)
  return (
    <EventLogForm
      mode="edit"
      event={event}
      attributes={attributes}
      profiles={toProfileChips(profiles)}
      currentUserId={user.id}
    />
  )
}
