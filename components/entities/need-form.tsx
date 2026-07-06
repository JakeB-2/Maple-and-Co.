'use client'

import { z } from 'zod'
import type { EventTypeRow } from '@/lib/queries/event-types'
import { createNeed, updateNeed } from '@/lib/actions/needs'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, useFormContext } from '@/components/screens/form-shell'
import { CheckboxField, NumberField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'
import { Button } from '@/components/ui/button'

// Client form-values shape mirrors lib/schemas/need.ts; NumberField (nullable)
// already emits number | null, so no reshaping beyond the refine.
const needFormSchema = z
  .object({
    entity_id: z.uuid(),
    event_type_id: z.string().min(1, 'Pick an event type'),
    expect_every_hours: z.number().positive('Must be positive').nullable(),
    warn_after_hours: z.number().positive('Must be positive').nullable(),
    show_on_today: z.boolean(),
    sort_order: z.coerce.number().int(),
  })
  .refine((v) => v.warn_after_hours === null || v.expect_every_hours !== null, {
    message: 'Warn-after needs an expected cadence first',
    path: ['warn_after_hours'],
  })

export type NeedFormDefaults = z.input<typeof needFormSchema>

// The common cadences as one-tap presets; 'No schedule' clears to NULL =
// track-last-done-only (the Meds pattern, D-026).
const CADENCE_PRESETS = [
  { label: '12h', hours: 12 },
  { label: 'Daily', hours: 24 },
  { label: '2 days', hours: 48 },
  { label: '3 days', hours: 72 },
  { label: 'Weekly', hours: 168 },
  { label: 'No schedule', hours: null },
] as const

function CadenceField() {
  const { watch, setValue } = useFormContext()
  const current = watch('expect_every_hours') as number | null

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <NumberField name="expect_every_hours" label="Expect every (hours)" min={0} step="any" nullable />
      <div className="flex flex-wrap gap-1.5">
        {CADENCE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant={current === preset.hours ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setValue('expect_every_hours', preset.hours, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Leave empty for no schedule — just track when it was last done.
      </p>
    </div>
  )
}

// Not user-facing — entity_id pins the need to its profile; sort_order is
// assigned on create, changed via the list's move arrows.
function HiddenFields() {
  const { register } = useFormContext()
  return (
    <>
      <input type="hidden" {...register('entity_id')} />
      <input type="hidden" {...register('sort_order')} />
    </>
  )
}

type NeedFormProps = {
  /** Event types of this entity's kind — the need's WHAT. */
  types: Pick<EventTypeRow, 'id' | 'name' | 'emoji'>[]
  /** The owning profile route; drawers return here after save. */
  basePath: string
  defaultValues: NeedFormDefaults
} & ({ mode: 'new' } | { mode: 'edit'; id: string })

export function NeedForm(props: NeedFormProps) {
  const fields = (
    <FormSection>
      <SelectField
        name="event_type_id"
        label="Event type"
        required
        options={props.types.map((type) => ({
          value: type.id,
          label: `${type.emoji} ${type.name}`,
        }))}
      />
      <CheckboxField name="show_on_today" label="Show on Today" />
      <CadenceField />
      <NumberField name="warn_after_hours" label="Fade after (hours)" min={0} step="any" nullable />
      <HiddenFields />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={needFormSchema}
        label="Need"
        listHref={props.basePath}
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={(values) => ({ ...values })}
        createAction={(values) => createNeed(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={needFormSchema}
      label="Need"
      listHref={props.basePath}
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={(values) => ({ ...values })}
      updateAction={(id, values) => updateNeed(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
