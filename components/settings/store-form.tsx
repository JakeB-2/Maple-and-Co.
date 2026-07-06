'use client'

import { z } from 'zod'
import { CURRENCIES } from '@/lib/config'
import { storeInputSchema, type StoreInput } from '@/lib/schemas/store'
import { createStore, updateStore } from '@/lib/actions/stores'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'

export type StoreFormDefaults = z.input<typeof storeInputSchema>

// Not user-facing — assigned on create, changed via the list's move arrows.
function SortOrderField() {
  const { register } = useFormContext()
  return <input type="hidden" {...register('sort_order')} />
}

type StoreFormProps = { defaultValues: StoreFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export function StoreForm(props: StoreFormProps) {
  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <TextField name="emoji" label="Emoji" required placeholder="🛒" maxLength={8} />
      <SelectField
        name="currency"
        label="Currency"
        options={CURRENCIES.map((currency) => ({ label: currency, value: currency }))}
      />
      <SortOrderField />
    </FormSection>
  )

  const transform = (values: StoreInput) => ({ ...values })

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={storeInputSchema}
        label="Store"
        listHref="/groceries/stores"
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={transform}
        createAction={(values) => createStore(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={storeInputSchema}
      label="Store"
      listHref="/groceries/stores"
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={transform}
      updateAction={(id, values) => updateStore(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
