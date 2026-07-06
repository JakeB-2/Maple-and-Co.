'use client'

import { z } from 'zod'
import { createSpendCategory, updateSpendCategory } from '@/lib/actions/spend-categories'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'
import { ColorField } from '@/components/screens/form-fields-color'

// Client form-values shape; the server's spendCategoryInputSchema re-validates
// (including the hex regex the ColorField palette always satisfies).
const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  color: z
    .string()
    .nullable()
    .refine((v) => !!v, 'Pick a color'),
  // Not user-facing — assigned on create, changed via the list's move arrows.
  sort_order: z.coerce.number().int(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>
export type CategoryFormDefaults = z.input<typeof categoryFormSchema>

function SortOrderField() {
  const { register } = useFormContext()
  return <input type="hidden" {...register('sort_order')} />
}

type CategoryFormProps = { defaultValues: CategoryFormDefaults } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export function CategoryForm(props: CategoryFormProps) {
  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <TextField name="emoji" label="Emoji" required placeholder="🛒" maxLength={8} />
      <ColorField name="color" label="Color" required span="full" />
      <SortOrderField />
    </FormSection>
  )

  const transform = (values: CategoryFormValues) => ({ ...values })

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={categoryFormSchema}
        label="Category"
        listHref="/finance/categories"
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={transform}
        createAction={(values) => createSpendCategory(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={categoryFormSchema}
      label="Category"
      listHref="/finance/categories"
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={transform}
      updateAction={(id, values) => updateSpendCategory(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
