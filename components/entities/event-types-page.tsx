// Shared event-type catalog body (relocated from /settings/pet-events by
// D-033; kind-scoped by D-032). The /pets/types and /plants/types route files
// are thin wrappers.

import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchEventTypes } from '@/lib/queries/event-types'
import { fetchAllNeeds } from '@/lib/queries/needs'
import type { EntityKind } from '@/lib/queries/entities'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { EventTypeList } from '@/components/settings/event-type-list'
import { EventTypeFormBody } from '@/components/settings/event-type-form-body'
import { KIND_COPY } from '@/components/entities/entity-kind'

export type EventTypesSearchParams = Promise<{ new?: string; edit?: string }>

export async function EventTypesPage({
  kind,
  searchParams,
}: {
  kind: EntityKind
  searchParams: EventTypesSearchParams
}) {
  const { supabase } = await requireAuth()
  const params = await searchParams
  const editId = sanitizeUuidParam(params.edit)
  const copy = KIND_COPY[kind]

  const [types, needs] = await Promise.all([fetchEventTypes(supabase, kind), fetchAllNeeds(supabase)])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Event types"
        subtitle={`What you log about your ${copy.noun}s — tap a type to shape its fields.`}
        backHref={copy.base}
        backLabel={copy.label}
      />

      <EventTypeList
        kind={kind}
        types={types.map(({ id, name, emoji, system_key }) => ({ id, name, emoji, system_key }))}
        typeIdsInUse={needs.map((need) => need.event_type_id)}
      />

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New event type"
        editTitle="Edit event type"
        newSize="sm"
        editSize="sm"
        newBody={<EventTypeFormBody mode="new" kind={kind} />}
        editBody={editId ? <EventTypeFormBody mode="edit" kind={kind} id={editId} /> : null}
      />
    </div>
  )
}
