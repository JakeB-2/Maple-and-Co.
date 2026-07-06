'use client'

import { z } from 'zod'
import { CURRENCIES } from '@/lib/config'
import { formatLocalDate } from '@/lib/format-date'
import { createSpend, updateSpend } from '@/lib/actions/spends'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { NumberField, TextareaField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'
import { DateField } from '@/components/screens/form-fields-date'
import { PhotoField } from '@/components/screens/form-fields-photo'

// Client form-values shape: strings for nullables (RHF-friendly), Date | string
// for spent_on (DateField emits Date; edit defaults arrive as 'YYYY-MM-DD').
// `toSpendInput` narrows this to the server's SpendInput.
const spendFormSchema = z.object({
  // Amount is a nullable NumberField: '' -> null -> coerced 0 -> caught by positive().
  amount: z.coerce.number().positive('Amount must be more than zero').multipleOf(0.01),
  currency: z.enum(CURRENCIES),
  spent_on: z
    .union([z.date(), z.iso.date()])
    .nullable()
    .refine((v) => v !== null, 'Pick a date'),
  spent_by_user_id: z.string().min(1, 'Pick who spent it'),
  category_id: z.string(),
  note: z.string().max(500),
  photo_path: z.string(),
})

type SpendFormValues = z.infer<typeof spendFormSchema>
export type SpendFormDefaults = z.input<typeof spendFormSchema>

function toSpendInput(values: SpendFormValues): Record<string, unknown> {
  return {
    ...values,
    spent_on: values.spent_on instanceof Date ? formatLocalDate(values.spent_on) : values.spent_on,
    category_id: values.category_id || null,
    note: values.note.trim() || null,
    photo_path: values.photo_path || null,
  }
}

type SpendFormProps = {
  defaultValues: SpendFormDefaults
  categories: { id: string; name: string; emoji: string }[]
  profiles: { id: string; display_name: string }[]
} & ({ mode: 'new' } | { mode: 'edit'; id: string })

export function SpendForm(props: SpendFormProps) {
  const fields = (
    <FormSection>
      <NumberField name="amount" label="Amount" required min={0} step="any" nullable autoFocus />
      <SelectField
        name="currency"
        label="Currency"
        options={CURRENCIES.map((currency) => ({ label: currency, value: currency }))}
      />
      <SelectField
        name="category_id"
        label="Category"
        allowNone="No category"
        options={props.categories.map((category) => ({
          label: `${category.emoji} ${category.name}`,
          value: category.id,
        }))}
      />
      <SelectField
        name="spent_by_user_id"
        label="Spent by"
        required
        options={props.profiles.map((profile) => ({
          label: profile.display_name,
          value: profile.id,
        }))}
      />
      <DateField name="spent_on" label="Date" required />
      <TextareaField name="note" label="Note" span="full" placeholder="What was it?" />
      <PhotoField name="photo_path" folder="spends" alt="Attached spend photo" />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={spendFormSchema}
        label="Spend"
        createLabel="Log spend"
        listHref="/finance"
        defaultValues={props.defaultValues}
        transform={toSpendInput}
        createAction={(values) => createSpend(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={spendFormSchema}
      label="Spend"
      listHref="/finance"
      defaultValues={props.defaultValues}
      transform={toSpendInput}
      updateAction={(id, values) => updateSpend(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
