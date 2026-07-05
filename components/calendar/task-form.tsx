'use client'

import { z } from 'zod'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { formatLocalDate, todayInTimeZone } from '@/lib/format-date'
import { createTask, updateTask } from '@/lib/actions/tasks'
import { recurrenceInputSchema } from '@/lib/recurrence/types'
import { RecurrenceEditor } from '@/components/calendar/recurrence-editor'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, FieldWrapper } from '@/components/screens/form-shell'
import { TextField, TextareaField } from '@/components/screens/form-fields-text'
import { SelectField } from '@/components/screens/form-fields-select'
import { DateField } from '@/components/screens/form-fields-date'

// Client form-values shape: strings for the RHF-friendly text fields, Date | string
// for anchor_on (DateField emits Date; edit defaults arrive as 'YYYY-MM-DD'), and
// the parsed recurrence rule (or null one-off). `toTaskInput` narrows this to the
// server's TaskInput — the Maple linkage's pet_id is derived from the linked type.
const taskFormSchema = z.object({
  title: z.string().min(1, 'Give it a title').max(120),
  emoji: z.string().min(1, 'Add an emoji').max(8),
  anchor_on: z
    .union([z.date(), z.iso.date()])
    .nullable()
    .refine((v) => v !== null, 'Pick a date'),
  note: z.string().max(1000),
  recurrence: recurrenceInputSchema, // RecurrenceRule | null
  log_pet_event_type_id: z.string(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>
export type TaskFormDefaults = z.input<typeof taskFormSchema>

function toTaskInput(values: TaskFormValues, primaryPetId: string | null): Record<string, unknown> {
  // A Maple linkage needs the pet — derive pet_id from the chosen log type (the
  // DB CHECK enforces the pairing; the server schema refines it too).
  const logTypeId = values.log_pet_event_type_id || null
  return {
    title: values.title,
    emoji: values.emoji,
    note: values.note.trim() || null,
    anchor_on: values.anchor_on instanceof Date ? formatLocalDate(values.anchor_on) : values.anchor_on,
    recurrence: values.recurrence,
    log_pet_event_type_id: logTypeId,
    pet_id: logTypeId ? primaryPetId : null,
  }
}

// Controlled recurrence field: RecurrenceEditor is a bespoke composite widget, so
// it hangs off useController rather than a *Field primitive. anchorDate tracks the
// live "First due" value (presets read its weekday / day-of-month) — falling back
// to today only if the date is cleared.
function RecurrenceField() {
  const { control } = useFormContext<TaskFormDefaults>()
  const { field, fieldState } = useController<TaskFormDefaults, 'recurrence'>({
    control,
    name: 'recurrence',
  })
  const anchor = useWatch<TaskFormDefaults>({ control, name: 'anchor_on' })
  const anchorDate =
    anchor instanceof Date
      ? formatLocalDate(anchor)
      : typeof anchor === 'string' && anchor
        ? anchor.slice(0, 10)
        : todayInTimeZone(HOUSEHOLD_TZ)

  return (
    <FieldWrapper label="Repeat" span="full" error={fieldState.error?.message as string | undefined}>
      <RecurrenceEditor value={field.value} onChange={field.onChange} anchorDate={anchorDate} mode="task" />
    </FieldWrapper>
  )
}

type TaskFormProps = {
  defaultValues: TaskFormDefaults
  petEventTypeOptions: { id: string; name: string; emoji: string }[]
  primaryPetId: string | null
} & ({ mode: 'new' } | { mode: 'edit'; id: string })

export function TaskForm(props: TaskFormProps) {
  const fields = (
    <FormSection>
      <TextField name="emoji" label="Emoji" maxLength={8} inputClassName="max-w-[12ch]" />
      <TextField name="title" label="Title" required autoFocus placeholder="What needs doing?" />
      <DateField name="anchor_on" label="First due" required />
      <TextareaField name="note" label="Note" span="full" placeholder="Any details?" />
      <RecurrenceField />
      <SelectField
        name="log_pet_event_type_id"
        label="Log to Maple"
        allowNone="Don't log"
        options={props.petEventTypeOptions.map((type) => ({
          label: `${type.emoji} ${type.name}`,
          value: type.id,
        }))}
      />
    </FormSection>
  )

  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={taskFormSchema}
        label="Task"
        createLabel="Add task"
        listHref="/tasks"
        defaultValues={props.defaultValues}
        transform={(values) => toTaskInput(values, props.primaryPetId)}
        createAction={(values) => createTask(values)}
      >
        {fields}
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={taskFormSchema}
      label="Task"
      listHref="/tasks"
      defaultValues={props.defaultValues}
      transform={(values) => toTaskInput(values, props.primaryPetId)}
      updateAction={(id, values) => updateTask(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
