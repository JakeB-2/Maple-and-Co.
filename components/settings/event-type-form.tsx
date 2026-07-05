'use client'

import { z } from 'zod'
import { petEventTypeInputSchema, type PetEventTypeInput } from '@/lib/schemas/pet-event-type'
import { createPetEventType, updatePetEventType } from '@/lib/actions/pet-event-types'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { CheckboxField, NumberField, TextField } from '@/components/screens/form-fields-text'

export type EventTypeFormDefaults = z.input<typeof petEventTypeInputSchema>

// Not user-facing — assigned on create, changed via the list's move arrows.
function SortOrderField() {
  const { register } = useFormContext()
  return <input type="hidden" {...register('sort_order')} />
}

type EventTypeFormProps = { defaultValues: EventTypeFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export function EventTypeForm(props: EventTypeFormProps) {
  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <TextField name="emoji" label="Emoji" required placeholder="🐾" maxLength={8} />
      <CheckboxField name="show_on_today" label="Show on Today" />
      <NumberField name="expect_every_hours" label="Expect every (hours)" min={0} step="any" nullable />
      <NumberField name="warn_after_hours" label="Fade after (hours)" min={0} step="any" nullable />
      <SortOrderField />
    </FormSection>
  )

  const transform = (values: PetEventTypeInput) => ({ ...values })

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={petEventTypeInputSchema}
        label="Event type"
        listHref="/settings/pet-events"
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={transform}
        createAction={(values) => createPetEventType(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={petEventTypeInputSchema}
      label="Event type"
      listHref="/settings/pet-events"
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={transform}
      updateAction={(id, values) => updatePetEventType(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
