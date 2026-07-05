// Async server bodies for the attribute create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { fetchAttributesForType, selectableAttributeOptions } from '@/lib/queries/pet-event-types'
import { AttributeForm, type AttributeFormDefaults, type ValueKind } from './attribute-form'

type AttributeFormBodyProps = { typeId: string } & ({ mode: 'new' } | { mode: 'edit'; id: string })

export async function AttributeFormBody(props: AttributeFormBodyProps) {
  const { supabase } = await requireAuth()
  const attributes = await fetchAttributesForType(supabase, props.typeId)

  if (props.mode === 'edit') {
    const row = attributes.find((attribute) => attribute.id === props.id)
    if (!row) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          This attribute is gone — it may have just been deleted.
        </p>
      )
    }
    // Kind locks only once a value exists (same predicate the action uses).
    const { data: logged } = await supabase
      .from('pet_event_values')
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
  return <AttributeForm mode="new" defaultValues={defaults} />
}
