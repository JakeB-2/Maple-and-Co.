// Async server bodies for the need create (?new=1) and edit (?edit_need=<id>)
// drawers on the entity profile.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import type { EntityKind } from '@/lib/queries/entities'
import { fetchEventTypes } from '@/lib/queries/event-types'
import { fetchNeedsForEntity } from '@/lib/queries/needs'
import { entityPath } from '@/components/entities/entity-kind'
import { NeedForm, type NeedFormDefaults } from './need-form'

type NeedFormBodyProps = { entityId: string; kind: EntityKind } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export async function NeedFormBody(props: NeedFormBodyProps) {
  const { supabase } = await requireAuth()
  const basePath = entityPath(props.kind, props.entityId)

  const [types, needs] = await Promise.all([
    fetchEventTypes(supabase, props.kind),
    fetchNeedsForEntity(supabase, props.entityId),
  ])
  const typeOptions = types.map(({ id, name, emoji }) => ({ id, name, emoji }))

  if (props.mode === 'edit') {
    const row = needs.find((need) => need.id === props.id)
    if (!row) {
      return <FormBodyNotFound noun="need" />
    }
    const defaults: NeedFormDefaults = {
      entity_id: row.entity_id,
      event_type_id: row.event_type_id,
      expect_every_hours: row.expect_every_hours,
      warn_after_hours: row.warn_after_hours,
      show_on_today: row.show_on_today,
      sort_order: row.sort_order,
    }
    return (
      <NeedForm mode="edit" id={row.id} types={typeOptions} basePath={basePath} defaultValues={defaults} />
    )
  }

  // Default the picker to the first type this entity doesn't track yet — the
  // live UNIQUE (entity_id, event_type_id) would reject a duplicate anyway.
  const trackedTypeIds = new Set(needs.map((need) => need.event_type_id))
  const firstUntracked = types.find((type) => !trackedTypeIds.has(type.id))
  const nextSortOrder = needs.length > 0 ? Math.max(...needs.map((n) => n.sort_order)) + 1 : 0
  const defaults: NeedFormDefaults = {
    entity_id: props.entityId,
    event_type_id: firstUntracked?.id ?? '',
    expect_every_hours: null,
    warn_after_hours: null,
    show_on_today: false,
    sort_order: nextSortOrder,
  }
  return <NeedForm mode="new" types={typeOptions} basePath={basePath} defaultValues={defaults} />
}
