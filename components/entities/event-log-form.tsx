'use client'

// THE generic event form (D-013's whole point): one renderer keyed on
// value_kind — no per-type forms. Schema, defaults and the RPC payload come
// from the pure helpers in lib/calculations/entity-event-form. AppForm +
// useActionSubmit are wired directly (instead of CrudForm) because the schema
// keys are dynamic attribute ids.

import { useMemo } from 'react'
import { z } from 'zod'
import {
  buildEventFormSchema,
  eventFormDefaults,
  formValuesToEventValues,
} from '@/lib/calculations/entity-event-form'
import { selectableAttributeOptions, type EventTypeAttributeRow } from '@/lib/queries/event-types'
import type { EntityEventRow } from '@/lib/queries/entity-events'
import { logEntityEvent, updateEntityEvent } from '@/lib/actions/entity-events'
import { useActionSubmit } from '@/lib/hooks/use-crud-submit'
import type { ProfileChip } from '@/components/screens/entity-social'
import {
  AppForm,
  FieldWrapper,
  FormActions,
  FormSection,
  useFormContext,
} from '@/components/screens/form-shell'
import {
  CheckboxField,
  NumberField,
  TextField,
  TextareaField,
} from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'
import { PhotoField } from '@/components/screens/form-fields-photo'
import { ActionWarnings } from '@/components/ui/action-warnings'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import type { EntityKind } from '@/lib/queries/entities'
import { KIND_COPY } from '@/components/entities/entity-kind'

// ISO -> 'YYYY-MM-DDTHH:mm' in the device's local wall-clock (their phones are
// set to America/Cancun, the app's fixed TZ — D-008), for the datetime-local.
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function WhenField() {
  const { register, formState } = useFormContext()
  const error = formState.errors.occurred_at?.message as string | undefined
  return (
    <FieldWrapper label="When" error={error} htmlFor="occurred_at">
      <Input id="occurred_at" type="datetime-local" {...register('occurred_at')} />
    </FieldWrapper>
  )
}

function MultiChoiceField({ attr }: { attr: EventTypeAttributeRow }) {
  const { watch, setValue, formState } = useFormContext()
  const selected = (watch(attr.id) as string[] | undefined) ?? []
  const error = formState.errors[attr.id]?.message as string | undefined

  return (
    <FieldWrapper label={attr.label} error={error} required={attr.required} span="full">
      <ToggleGroup
        type="multiple"
        variant="outline"
        spacing={2}
        className="flex-wrap"
        aria-label={attr.label}
        value={selected}
        onValueChange={(value) => setValue(attr.id, value, { shouldDirty: true })}
      >
        {selectableAttributeOptions(attr).map((option) => (
          <ToggleGroupItem key={option.id} value={option.id}>
            {option.emoji ? `${option.emoji} ${option.label}` : option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldWrapper>
  )
}

function AttributeField({
  attr,
  photoFolder,
}: {
  attr: EventTypeAttributeRow
  photoFolder: 'pets' | 'plants'
}) {
  switch (attr.value_kind) {
    case 'text':
      return <TextField name={attr.id} label={attr.label} required={attr.required} />
    case 'long_text':
      return <TextareaField name={attr.id} label={attr.label} required={attr.required} span="full" />
    case 'number':
      return (
        <NumberField
          name={attr.id}
          label={attr.unit ? `${attr.label} (${attr.unit})` : attr.label}
          required={attr.required}
          nullable={!attr.required}
          step="any"
        />
      )
    case 'boolean':
      return <CheckboxField name={attr.id} label={attr.label} />
    case 'single_choice':
      return (
        <SelectField
          name={attr.id}
          label={attr.label}
          required={attr.required}
          allowNone={attr.required ? undefined : 'None'}
          options={selectableAttributeOptions(attr).map((option) => ({
            value: option.id,
            label: option.emoji ? `${option.emoji} ${option.label}` : option.label,
          }))}
        />
      )
    case 'multi_choice':
      return <MultiChoiceField attr={attr} />
    case 'photo':
      return (
        <PhotoField name={attr.id} folder={photoFolder} label={attr.label} required={attr.required} />
      )
    default:
      return null
  }
}

type EventLogFormProps = {
  attributes: EventTypeAttributeRow[]
  profiles: ProfileChip[]
  currentUserId: string
  /** The owning entity's profile route (`/pets/<id>` | `/plants/<id>`). */
  basePath: string
  /** Owning entity's kind — drives the photo folder + toast flourish. */
  kind: EntityKind
} & (
  | { mode: 'new'; entityId: string; typeId: string; typeName: string; occurredAt: string }
  | { mode: 'edit'; event: EntityEventRow }
)

export function EventLogForm(props: EventLogFormProps) {
  const { attributes, profiles, currentUserId, basePath, kind } = props
  const photoFolder = KIND_COPY[kind].folder
  const event = props.mode === 'edit' ? props.event : undefined

  // buildEventFormSchema returns a ZodObject at runtime; narrow so the fixed
  // (non-EAV) fields can extend the dynamic attribute keys.
  const schema = useMemo(
    () =>
      (buildEventFormSchema(attributes) as unknown as z.ZodObject<z.ZodRawShape>).extend({
        occurred_at: z.string().min(1, 'Pick a date & time'),
        done_by_user_id: z.string().min(1, 'Pick who did it'),
        note: z.string().max(500),
      }) as unknown as z.ZodType<Record<string, unknown>, Record<string, unknown>>,
    [attributes],
  )

  const occurredAt = props.mode === 'new' ? props.occurredAt : props.event.occurred_at

  const { submitError, submitWarnings, force, setForce, handleSubmit } = useActionSubmit<
    Record<string, unknown>
  >({
    transform: (values) => ({
      ...(props.mode === 'new' ? { entity_id: props.entityId, event_type_id: props.typeId } : {}),
      // Serialize the picked local time to an ISO instant at SUBMIT time.
      occurred_at: new Date(values.occurred_at as string).toISOString(),
      done_by_user_id: values.done_by_user_id,
      note: typeof values.note === 'string' ? values.note.trim() || null : null,
      values: formValuesToEventValues(attributes, values),
      // The rendered attributes bound the RPC's value-clear so a since-deleted
      // attribute's values aren't destroyed by an edit.
      ...(props.mode === 'edit' ? { attribute_ids: attributes.map((attr) => attr.id) } : {}),
    }),
    onSubmit: (values) =>
      props.mode === 'new' ? logEntityEvent(values) : updateEntityEvent(props.event.id, values),
    redirect: (id) => `${basePath}?selected=${id}`,
    successMessage: props.mode === 'new' ? `Logged ${KIND_COPY[kind].logFlourish}` : undefined,
  })

  const title =
    props.mode === 'new'
      ? props.typeName
      : `${props.event.event_type.emoji} ${props.event.event_type.name}`

  return (
    <AppForm
      schema={schema}
      defaultValues={{
        ...eventFormDefaults(attributes, event?.values),
        occurred_at: toDatetimeLocal(occurredAt),
        done_by_user_id: event?.done_by_user_id ?? currentUserId,
        note: event?.note ?? '',
      }}
      onSubmit={handleSubmit}
      autoFocusFirstField
    >
      <div className="space-y-6">
        <FormSection title={title}>
          {attributes.map((attr) => (
            <AttributeField key={attr.id} attr={attr} photoFolder={photoFolder} />
          ))}
          <WhenField />
          <SelectField
            name="done_by_user_id"
            label="Who did it"
            required
            options={profiles.map((profile) => ({
              label: profile.display_name,
              value: profile.id,
            }))}
          />
          <TextareaField name="note" label="Note" span="full" />
        </FormSection>
        <ActionWarnings
          warnings={submitWarnings}
          force={force}
          onForceChange={setForce}
          forceLabel="I reviewed this warning - save anyway"
        />
        <FormActions
          cancelHref={props.mode === 'new' ? basePath : `${basePath}?selected=${props.event.id}`}
          submitLabel={props.mode === 'new' ? 'Log it' : 'Save Changes'}
          error={submitError}
        />
      </div>
    </AppForm>
  )
}
