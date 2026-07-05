'use client'

import { useRef, useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { CURRENCIES } from '@/lib/config'
import { formatLocalDate } from '@/lib/format-date'
import { createSpend, updateSpend, uploadSpendPhoto } from '@/lib/actions/spends'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FieldWrapper, FormSection, useFormContext } from '@/components/screens/form-shell'
import { NumberField, TextareaField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'
import { DateField } from '@/components/screens/form-fields-date'
import { Button } from '@/components/ui/button'

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

function SpendPhotoField() {
  const { register, setValue, watch } = useFormContext()
  const photoPath = watch('photo_path') as string
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-picking the same file after a failure
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const result = await uploadSpendPhoto(formData)
      if (result.error !== null) toast.error(result.error)
      else setValue('photo_path', result.data.path, { shouldDirty: true })
    } finally {
      setUploading(false)
    }
  }

  return (
    <FieldWrapper label="Photo" span="full">
      <input type="hidden" {...register('photo_path')} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
      />
      {photoPath ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it */}
          <img
            src={`/media/${photoPath}`}
            alt="Attached spend photo"
            className="max-h-40 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -right-2 -top-2 size-7 touch:size-9 rounded-full shadow"
            aria-label="Remove photo"
            onClick={() => setValue('photo_path', '', { shouldDirty: true })}
          >
            <X />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {uploading ? 'Uploading…' : 'Add photo'}
        </Button>
      )}
    </FieldWrapper>
  )
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
      <SpendPhotoField />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={spendFormSchema}
        label="Spend"
        createLabel="Log spend"
        listHref="/spending"
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
      listHref="/spending"
      defaultValues={props.defaultValues}
      transform={toSpendInput}
      updateAction={(id, values) => updateSpend(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
