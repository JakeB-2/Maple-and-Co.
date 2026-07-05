'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useController, useFormContext } from 'react-hook-form'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { formatLocalDate, todayInTimeZone } from '@/lib/format-date'
import { createCalendarEvent, updateCalendarEvent } from '@/lib/actions/calendar-events'
import { recurrenceInputSchema } from '@/lib/recurrence/types'
import { RecurrenceEditor } from '@/components/calendar/recurrence-editor'
import { ResourceCrudForm } from '@/components/screens/resource-crud-form'
import { FormSection, FieldWrapper } from '@/components/screens/form-shell'
import { TextField, TextareaField, CheckboxField } from '@/components/screens/form-fields-text'
import { DateField } from '@/components/screens/form-fields-date'
import { Input } from '@/components/ui/input'

// Client form-values shape: '' for the nullable strings (RHF-friendly), Date |
// string for starts_on (DateField emits Date; edit defaults arrive as
// 'YYYY-MM-DD'), and '' times that the server schema normalizes to null.
// `toEventInput` narrows this to the server's CalendarEventInput.
const eventFormSchema = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(120),
  all_day: z.boolean(),
  // Native <input type="time"> emits '' or 'HH:MM'; server normalizes '' -> null.
  start_time: z.string(),
  end_time: z.string(),
  starts_on: z
    .union([z.date(), z.iso.date()])
    .nullable()
    .refine((v) => v !== null, 'Pick a date'),
  location: z.string().max(200),
  note: z.string().max(1000),
  recurrence: recurrenceInputSchema, // RecurrenceRule | null (one-off)
})

type EventFormValues = z.infer<typeof eventFormSchema>
export type EventFormDefaults = z.input<typeof eventFormSchema>

function toEventInput(values: EventFormValues): Record<string, unknown> {
  // recurrence + start_time/end_time pass straight through; the server schema
  // re-validates and normalizes '' times to null.
  return {
    ...values,
    starts_on: values.starts_on instanceof Date ? formatLocalDate(values.starts_on) : values.starts_on,
    location: values.location.trim() || null,
    note: values.note.trim() || null,
  }
}

// There is no shared TimeField — a timed event needs a start/end clock time, so
// wire a native <input type="time"> straight to RHF ('' means "no time").
function TimeField({ name, label }: { name: 'start_time' | 'end_time'; label: string }) {
  const { register, formState: { errors } } = useFormContext<EventFormValues>()
  const error = errors[name]?.message

  return (
    <FieldWrapper label={label} error={error} htmlFor={name}>
      <Input id={name} type="time" {...register(name)} />
    </FieldWrapper>
  )
}

// Rendered inside ResourceCrudForm's FormProvider so the fields can watch the
// all-day toggle / event date and drive the recurrence editor.
function EventFields() {
  const { control, watch, setValue } = useFormContext<EventFormValues>()
  const allDay = watch('all_day')
  const startsOn = watch('starts_on')
  const { field: recurrence, fieldState: recurrenceState } = useController({ control, name: 'recurrence' })

  // All-day events carry no clock time; clearing on toggle keeps the server's
  // all-day refine (start_time === null && end_time === null) satisfied.
  useEffect(() => {
    if (allDay) {
      setValue('start_time', '')
      setValue('end_time', '')
    }
  }, [allDay, setValue])

  // RecurrenceEditor anchors its weekly/monthly fallbacks on the event date.
  const anchorDate =
    startsOn instanceof Date
      ? formatLocalDate(startsOn)
      : typeof startsOn === 'string' && startsOn
        ? startsOn
        : todayInTimeZone(HOUSEHOLD_TZ)

  return (
    <FormSection>
      <TextField name="title" label="Title" required autoFocus />
      <CheckboxField name="all_day" label="All day" />
      {!allDay && (
        <>
          <TimeField name="start_time" label="Starts" />
          <TimeField name="end_time" label="Ends" />
        </>
      )}
      <DateField name="starts_on" label="Date" required />
      <TextField name="location" label="Location" />
      <TextareaField name="note" label="Note" span="full" placeholder="Anything to remember?" />
      <FieldWrapper label="Repeats" span="full" error={recurrenceState.error?.message}>
        <RecurrenceEditor
          mode="event"
          anchorDate={anchorDate}
          value={recurrence.value}
          onChange={recurrence.onChange}
        />
      </FieldWrapper>
    </FormSection>
  )
}

type EventFormProps = {
  defaultValues: EventFormDefaults
} & ({ mode: 'new' } | { mode: 'edit'; id: string })

export function EventForm(props: EventFormProps) {
  if (props.mode === 'new') {
    return (
      <ResourceCrudForm
        mode="new"
        schema={eventFormSchema}
        label="Event"
        createLabel="Add event"
        listHref="/calendar"
        // A recurring event has no single occurrence to reopen, and the calendar
        // reads ?selected as an <id>:<date> occurrence key (not a bare id) — so
        // land back on the month view rather than a dead ?selected=<uuid>.
        redirectMode="list"
        defaultValues={props.defaultValues}
        transform={toEventInput}
        createAction={(values) => createCalendarEvent(values)}
      >
        <EventFields />
      </ResourceCrudForm>
    )
  }

  return (
    <ResourceCrudForm
      mode="edit"
      id={props.id}
      schema={eventFormSchema}
      label="Event"
      listHref="/calendar"
      redirectMode="list"
      defaultValues={props.defaultValues}
      transform={toEventInput}
      updateAction={(id, values) => updateCalendarEvent(id, values)}
    >
      <EventFields />
    </ResourceCrudForm>
  )
}
