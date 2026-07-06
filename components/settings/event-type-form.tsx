'use client'

import { z } from 'zod'
import { eventTypeInputSchema, type EventTypeInput } from '@/lib/schemas/event-type'
import { createEventType, updateEventType } from '@/lib/actions/event-types'
import type { EntityKind } from '@/lib/queries/entities'
import { KIND_COPY } from '@/components/entities/entity-kind'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'

// Cadence/show_on_today moved off types onto per-entity needs (D-032) — a type
// is just name + emoji + order now.
export type EventTypeFormDefaults = z.input<typeof eventTypeInputSchema>

// Not user-facing — assigned on create, changed via the list's move arrows.
function SortOrderField() {
  const { register } = useFormContext()
  return <input type="hidden" {...register('sort_order')} />
}

type EventTypeFormProps = { kind: EntityKind; defaultValues: EventTypeFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export function EventTypeForm(props: EventTypeFormProps) {
  const listHref = `${KIND_COPY[props.kind].base}/types`
  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <TextField name="emoji" label="Emoji" required placeholder="🐾" maxLength={8} />
      <SortOrderField />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={eventTypeInputSchema}
        label="Event type"
        listHref={listHref}
        redirectMode="list"
        defaultValues={props.defaultValues}
        // entity_kind is create-only: it pins the type to this module's catalog.
        transform={(values: EventTypeInput) => ({ ...values, entity_kind: props.kind })}
        createAction={(values) => createEventType(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={eventTypeInputSchema}
      label="Event type"
      listHref={listHref}
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={(values: EventTypeInput) => ({ ...values })}
      updateAction={(id, values) => updateEventType(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
