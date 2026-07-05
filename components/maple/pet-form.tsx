'use client'

import { z } from 'zod'
import { formatLocalDate } from '@/lib/format-date'
import { updatePet } from '@/lib/actions/pets'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'
import { DateField } from '@/components/screens/form-fields-date'
import { PhotoField } from '@/components/screens/form-fields-photo'

// Client form-values shape: '' for the nullable photo_path (RHF-friendly),
// Date | string for birthday (DateField emits Date; edit defaults arrive as
// 'YYYY-MM-DD'). `toPetInput` narrows this to the server's PetInput.
const petFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  birthday: z.union([z.date(), z.iso.date()]).nullable(),
  photo_path: z.string(),
})

type PetFormValues = z.infer<typeof petFormSchema>
export type PetFormDefaults = z.input<typeof petFormSchema>

function toPetInput(values: PetFormValues): Record<string, unknown> {
  return {
    ...values,
    birthday: values.birthday instanceof Date ? formatLocalDate(values.birthday) : values.birthday || null,
    photo_path: values.photo_path || null,
  }
}

type PetFormProps = {
  mode: 'edit'
  id: string
  defaultValues: PetFormDefaults
}

// Edit-only: the household pet is seeded, never created from a drawer.
export function PetForm(props: PetFormProps) {
  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={petFormSchema}
      label="Pet"
      listHref="/maple"
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={toPetInput}
      updateAction={(id, values) => updatePet(id, values)}
    >
      <FormSection>
        <TextField name="name" label="Name" required autoFocus />
        <DateField name="birthday" label="Birthday" />
        <PhotoField name="photo_path" folder="pets" alt="Attached pet photo" />
      </FormSection>
    </ResourceCrudForm>
  )
}
