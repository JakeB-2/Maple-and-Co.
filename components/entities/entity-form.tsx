'use client'

import { z } from 'zod'
import { formatLocalDate } from '@/lib/format-date'
import type { EntityKind } from '@/lib/queries/entities'
import { createEntity, updateEntity } from '@/lib/actions/entities'
import { CrudForm } from '@/components/screens/crud-form'
import { FormSection } from '@/components/screens/form-shell'
import { TextField } from '@/components/screens/form-fields-text'
import { DateField } from '@/components/screens/form-fields-date'
import { PhotoField } from '@/components/screens/form-fields-photo'
import { KIND_COPY, entityPath } from '@/components/entities/entity-kind'

// Client form-values shape: '' for the nullable photo_path (RHF-friendly),
// Date | string for birthday (DateField emits Date; edit defaults arrive as
// 'YYYY-MM-DD'). `toEntityInput` narrows this to the server's EntityInput.
const entityFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  birthday: z.union([z.date(), z.iso.date()]).nullable(),
  photo_path: z.string(),
})

type EntityFormValues = z.infer<typeof entityFormSchema>
export type EntityFormDefaults = z.input<typeof entityFormSchema>

// kind rides along server-side (D-032): the module route, not the user, says
// whether this is a pet or a plant.
function toEntityInput(kind: EntityKind, values: EntityFormValues): Record<string, unknown> {
  return {
    ...values,
    kind,
    birthday: values.birthday instanceof Date ? formatLocalDate(values.birthday) : values.birthday || null,
    photo_path: values.photo_path || null,
  }
}

type EntityFormProps = { kind: EntityKind } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string; defaultValues: EntityFormDefaults }
)

export function EntityForm(props: EntityFormProps) {
  const copy = KIND_COPY[props.kind]
  const fields = (
    <FormSection>
      <TextField name="name" label="Name" required autoFocus />
      <DateField name="birthday" label={copy.birthdayLabel} />
      <PhotoField name="photo_path" folder={copy.folder} alt={`Attached ${copy.noun} photo`} />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <CrudForm
        schema={entityFormSchema}
        defaultValues={{ name: '', birthday: null, photo_path: '' }}
        transform={(values) => toEntityInput(props.kind, values)}
        onSubmit={(values) => createEntity(values)}
        // Land on the fresh profile — the natural next step is adding needs.
        redirect={(id) => entityPath(props.kind, id)}
        title={`New ${copy.noun}`}
        backHref={copy.base}
        cancelHref={copy.base}
        submitLabel={`Add ${copy.noun}`}
        chrome="drawer"
      >
        {fields}
      </CrudForm>
    )
  }

  const profileHref = entityPath(props.kind, props.id)
  return (
    <CrudForm
      schema={entityFormSchema}
      defaultValues={props.defaultValues}
      transform={(values) => toEntityInput(props.kind, values)}
      onSubmit={(values) => updateEntity(props.id, values)}
      redirect={{ mode: 'list', listHref: profileHref }}
      title={`Edit ${copy.noun}`}
      backHref={profileHref}
      cancelHref={profileHref}
      submitLabel="Save Changes"
      chrome="drawer"
    >
      {fields}
    </CrudForm>
  )
}
