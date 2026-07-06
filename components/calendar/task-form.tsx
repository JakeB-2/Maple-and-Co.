'use client'

import { useEffect } from 'react'
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
// server's TaskInput. A task links a need OR carries a free 'About' label, never
// both (D-032) — the refine mirrors the server schema and the DB CHECK.
const taskFormSchema = z
  .object({
    title: z.string().min(1, 'Give it a title').max(120),
    emoji: z.string().min(1, 'Add an emoji').max(8),
    anchor_on: z
      .union([z.date(), z.iso.date()])
      .nullable()
      .refine((v) => v !== null, 'Pick a date'),
    note: z.string().max(1000),
    recurrence: recurrenceInputSchema, // RecurrenceRule | null
    need_id: z.string(),
    entity_label: z.string().max(60),
  })
  .refine((v) => !v.need_id || !v.entity_label.trim(), {
    message: 'Pick a need or a label, not both',
    path: ['entity_label'],
  })

type TaskFormValues = z.infer<typeof taskFormSchema>
export type TaskFormDefaults = z.input<typeof taskFormSchema>

function toTaskInput(values: TaskFormValues): Record<string, unknown> {
  return {
    title: values.title,
    emoji: values.emoji,
    note: values.note.trim() || null,
    anchor_on: values.anchor_on instanceof Date ? formatLocalDate(values.anchor_on) : values.anchor_on,
    recurrence: values.recurrence,
    need_id: values.need_id || null,
    entity_label: values.entity_label.trim() || null,
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

// The need-or-label pair (D-032): filling one locks the other, so the form can
// never submit both (the schema refine + DB CHECK are the backstops). The lock
// also explains itself — clearer than a silently-ignored field.
function NeedLinkFields({ needOptions }: { needOptions: { label: string; value: string }[] }) {
  const { control, setValue } = useFormContext<TaskFormDefaults>()
  const needId = useWatch<TaskFormDefaults>({ control, name: 'need_id' })
  const entityLabel = useWatch<TaskFormDefaults>({ control, name: 'entity_label' })
  const hasNeed = typeof needId === 'string' && needId !== ''
  const hasLabel = typeof entityLabel === 'string' && entityLabel.trim() !== ''

  // Belt for the lock's braces: if both ever hold values (a race, a pasted
  // default), the chosen need wins and the label clears.
  useEffect(() => {
    if (hasNeed && hasLabel) setValue('entity_label', '')
  }, [hasNeed, hasLabel, setValue])

  return (
    <>
      <SelectField
        name="need_id"
        label="Fulfills a need"
        allowNone="No need"
        options={needOptions}
        locked={hasLabel}
        lockReason="Clear the About label to link a need"
      />
      <TextField
        name="entity_label"
        label="About"
        placeholder="e.g. Fridge"
        maxLength={60}
        locked={hasNeed}
        lockReason="Clear the linked need to add a label"
      />
      <p className="text-xs text-muted-foreground md:col-span-2">
        Completing a need-linked task logs it for the pet or plant too — no separate quick log.
      </p>
    </>
  )
}

type TaskFormProps = {
  defaultValues: TaskFormDefaults
  needOptions: { label: string; value: string }[]
} & ({ mode: 'new' } | { mode: 'edit'; id: string })

export function TaskForm(props: TaskFormProps) {
  const fields = (
    <FormSection>
      <TextField name="emoji" label="Emoji" maxLength={8} inputClassName="max-w-[12ch]" />
      <TextField name="title" label="Title" required autoFocus placeholder="What needs doing?" />
      <DateField name="anchor_on" label="First due" required />
      <TextareaField name="note" label="Note" span="full" placeholder="Any details?" />
      <RecurrenceField />
      <NeedLinkFields needOptions={props.needOptions} />
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
        transform={(values) => toTaskInput(values)}
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
      transform={(values) => toTaskInput(values)}
      updateAction={(id, values) => updateTask(id, values)}
    >
      {fields}
    </ResourceCrudForm>
  )
}
