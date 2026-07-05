'use client'

// ColorField — calendar-color picker primitive used by entity edit forms that
// color-code calendar entries. Curated palette of 12 chips so the calendar
// stays readable; "× None" clears to null. Pure presentational + RHF
// Controller wiring.

import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldWrapper } from './form-shell'

// Tailwind 500-shade palette, trimmed to 12 visually-distinct hues. Stored
// as hex strings so the value travels through to the calendar bar `style`
// attribute unchanged.
export const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
]

export function ColorField<T extends FieldValues>({
  name,
  label,
  required,
  span,
}: {
  name: Path<T>
  label?: string
  required?: boolean
  span?: 'full'
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_PALETTE.map((c) => {
              const selected = field.value === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => field.onChange(c.value)}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={selected}
                  className={cn(
                    'size-7 touch:size-9 rounded-md transition-shadow flex items-center justify-center text-white',
                    selected
                      ? 'ring-2 ring-offset-2 ring-foreground/40'
                      : 'hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20',
                  )}
                  style={{ background: c.value }}
                >
                  {selected && <Check className="size-3.5" />}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => field.onChange(null)}
              title="No Color"
              aria-label="No color"
              aria-pressed={!field.value}
              className={cn(
                'size-7 touch:size-9 rounded-md border bg-card text-muted-foreground flex items-center justify-center transition-shadow',
                !field.value
                  ? 'ring-2 ring-offset-2 ring-foreground/40'
                  : 'hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20',
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      />
    </FieldWrapper>
  )
}
