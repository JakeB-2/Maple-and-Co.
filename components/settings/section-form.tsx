'use client'

import { z } from 'zod'
import { storeSectionInputSchema, type StoreSectionInput } from '@/lib/schemas/store'
import { createStoreSection, updateStoreSection } from '@/lib/actions/store-sections'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'

export type SectionFormDefaults = z.input<typeof storeSectionInputSchema>

// Not user-facing — store_id pins the section to its store; sort_order is
// assigned on create, changed via the list's move arrows.
function HiddenFields() {
  const { register } = useFormContext()
  return (
    <>
      <input type="hidden" {...register('store_id')} />
      <input type="hidden" {...register('sort_order')} />
    </>
  )
}

type SectionFormProps = { defaultValues: SectionFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export function SectionForm(props: SectionFormProps) {
  const listHref = `/settings/stores/${props.defaultValues.store_id}`

  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <HiddenFields />
    </FormSection>
  )

  const transform = (values: StoreSectionInput) => ({ ...values })

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={storeSectionInputSchema}
        label="Section"
        listHref={listHref}
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={transform}
        createAction={(values) => createStoreSection(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={storeSectionInputSchema}
      label="Section"
      listHref={listHref}
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={transform}
      updateAction={(id, values) => updateStoreSection(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
