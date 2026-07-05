'use client'

// DateField — the only consumer of react-day-picker. Isolated in its own file
// so forms without a date field skip ~30 KB gzipped of calendar code.

import { useState } from 'react'
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseDateForCalendar } from '@/lib/format-date'
import { FieldWrapper } from './form-shell'

export function DateField<T extends FieldValues>({
  name,
  label,
  placeholder = 'Pick a date',
  required,
  span,
}: {
  name: Path<T>
  label?: string
  placeholder?: string
  required?: boolean
  span?: 'full'
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined
  const [open, setOpen] = useState(false)

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selectedDate = parseDateForCalendar(field.value)
          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={name as string}
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  aria-required={required || undefined}
                  data-autofocus-required={required ? 'true' : undefined}
                  data-autofocus-filled={selectedDate ? 'true' : 'false'}
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                  {selectedDate ? (
                    format(selectedDate, 'PPP')
                  ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] p-0" align="start" collisionPadding={8}>
                <Calendar
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(date) => {
                    field.onChange(date ?? null)
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        }}
      />
    </FieldWrapper>
  )
}
