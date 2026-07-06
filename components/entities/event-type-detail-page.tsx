// Shared event-type attributes body (relocated from /settings/pet-events/
// [typeId] by D-033). The /pets/types/[typeId] and /plants/types/[typeId]
// route files are thin wrappers.

import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchAttributesForType, fetchEventType } from '@/lib/queries/event-types'
import type { EntityKind } from '@/lib/queries/entities'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { AttributeList } from '@/components/settings/attribute-list'
import { AttributeFormBody } from '@/components/settings/attribute-form-body'
import { KIND_COPY } from '@/components/entities/entity-kind'

export type EventTypeDetailParams = Promise<{ typeId: string }>
export type EventTypeDetailSearchParams = Promise<{ new?: string; edit?: string }>

export async function EventTypeDetailPage({
  kind,
  params,
  searchParams,
}: {
  kind: EntityKind
  params: EventTypeDetailParams
  searchParams: EventTypeDetailSearchParams
}) {
  const { supabase } = await requireAuth()
  const { typeId: rawTypeId } = await params
  const search = await searchParams

  const typeId = sanitizeUuidParam(rawTypeId)
  if (!typeId) notFound()
  const editId = sanitizeUuidParam(search.edit)

  const [type, attributes] = await Promise.all([
    fetchEventType(supabase, typeId),
    fetchAttributesForType(supabase, typeId),
  ])
  // A live type of the OTHER kind pasted under this module's route is a 404
  // too — its edit hrefs would otherwise cross modules.
  if (!type || type.entity_kind !== kind) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${type.emoji} ${type.name}`}
        subtitle="Top to bottom = the log form's field order."
        backHref={`${KIND_COPY[kind].base}/types`}
        backLabel="Event types"
      />

      <AttributeList
        kind={kind}
        typeId={typeId}
        attributes={attributes.map(({ id, label, value_kind, unit, required, system_key }) => ({
          id,
          label,
          value_kind,
          unit,
          required,
          system_key,
        }))}
      />

      <ResourceFormDrawers
        isNew={search.new === '1'}
        editId={editId}
        newTitle="New attribute"
        editTitle="Edit attribute"
        newSize="sm"
        editSize="sm"
        newBody={<AttributeFormBody mode="new" kind={kind} typeId={typeId} />}
        editBody={editId ? <AttributeFormBody mode="edit" kind={kind} id={editId} typeId={typeId} /> : null}
      />
    </div>
  )
}
