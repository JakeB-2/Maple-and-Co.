// Async server bodies for the entity create (?new=1, index) and edit
// (?edit_entity=<id>, profile) drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import type { EntityKind } from '@/lib/queries/entities'
import { fetchEntity } from '@/lib/queries/entities'
import { KIND_COPY } from '@/components/entities/entity-kind'
import { EntityForm, type EntityFormDefaults } from './entity-form'

type EntityFormBodyProps = { kind: EntityKind } & ({ mode: 'new' } | { mode: 'edit'; id: string })

export async function EntityFormBody(props: EntityFormBodyProps) {
  if (props.mode === 'new') {
    // Create needs no reads — kind comes from the module route.
    return <EntityForm mode="new" kind={props.kind} />
  }

  const { supabase } = await requireAuth()
  const entity = await fetchEntity(supabase, props.id)

  // Guard the URL-carried id AND the kind — a plant id pasted under /pets
  // shouldn't open an editable pet drawer.
  if (!entity || entity.kind !== props.kind) {
    return <FormBodyNotFound noun={KIND_COPY[props.kind].noun} />
  }

  const defaults: EntityFormDefaults = {
    name: entity.name,
    birthday: entity.birthday,
    photo_path: entity.photo_path ?? '',
  }
  return <EntityForm mode="edit" kind={entity.kind} id={entity.id} defaultValues={defaults} />
}
