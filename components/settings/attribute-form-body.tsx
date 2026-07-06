// Async server bodies for the attribute create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import type { EntityKind } from '@/lib/queries/entities'
import { fetchAttributesForType, selectableAttributeOptions } from '@/lib/queries/event-types'
import { AttributeForm, type AttributeFormDefaults, type ValueKind } from './attribute-form'

type AttributeFormBodyProps = { kind: EntityKind; typeId: string } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export async function AttributeFormBody(props: AttributeFormBodyProps) {
  const { supabase } = await requireAuth()
  const attributes = await fetchAttributesForType(supabase, props.typeId)

  if (props.mode === 'edit') {
    const row = attributes.find((attribute) => attribute.id === props.id)
    if (!row) {
      return <FormBodyNotFound noun="attribute" />
    }
    // Kind locks only once a value exists (same predicate the action uses).
    const { data: logged } = await supabase
      .from('entity_event_values')
      .select('id')
      .eq('attribute_id', row.id)
      .limit(1)

    const defaults: AttributeFormDefaults = {
      event_type_id: row.event_type_id,
      label: row.label,
      // The DB CHECK constrains value_kind to VALUE_KINDS; the Row type is plain string.
      value_kind: row.value_kind as ValueKind,
      unit: row.unit ?? '',
      required: row.required,
      // Archived options stay out of the editor so removed lines don't reappear.
      options_text: selectableAttributeOptions(row)
        .map((option) => (option.emoji ? `${option.emoji} ${option.label}` : option.label))
        .join('\n'),
      sort_order: row.sort_order,
    }
    return (
      <AttributeForm
        mode="edit"
        kind={props.kind}
        id={row.id}
        hasLogged={(logged?.length ?? 0) > 0}
        defaultValues={defaults}
      />
    )
  }

  const nextSortOrder =
    attributes.length > 0 ? Math.max(...attributes.map((a) => a.sort_order)) + 1 : 0
  const defaults: AttributeFormDefaults = {
    event_type_id: props.typeId,
    label: '',
    value_kind: 'text',
    unit: '',
    required: false,
    options_text: '',
    sort_order: nextSortOrder,
  }
  return <AttributeForm mode="new" kind={props.kind} defaultValues={defaults} />
}
