import { z } from 'zod'
import { recurrenceInputSchema } from '@/lib/recurrence/types'

// Shared by the form (client) and the action (server) — one source of truth.

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/ // 'HH:MM' 24h

export const calendarEventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Give it a title').max(120),
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    location: z
      .string()
      .trim()
      .max(200)
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    starts_on: z.iso.date(),
    // RHF hands us '' for a cleared time input; normalize that to null.
    start_time: z
      .string()
      .regex(TIME_RE, 'Use HH:MM')
      .nullable()
      .or(z.literal('').transform(() => null)),
    end_time: z
      .string()
      .regex(TIME_RE, 'Use HH:MM')
      .nullable()
      .or(z.literal('').transform(() => null)),
    all_day: z.boolean(),
    recurrence: recurrenceInputSchema, // RecurrenceRule | null
  })
  .refine((v) => !v.all_day || (v.start_time === null && v.end_time === null), {
    message: 'All-day events have no start/end time',
    path: ['all_day'],
  })
  .refine((v) => v.end_time === null || v.start_time !== null, {
    message: 'Add a start time first',
    path: ['end_time'],
  })
  .refine((v) => v.end_time === null || v.start_time === null || v.end_time > v.start_time, {
    message: 'End must be after start',
    path: ['end_time'],
  })
  .refine((v) => v.recurrence === null || v.recurrence.semantics === 'fixed', {
    message: 'Events repeat on a fixed schedule',
    path: ['recurrence'],
  })

export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>
