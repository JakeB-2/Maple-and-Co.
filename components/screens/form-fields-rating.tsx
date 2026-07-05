'use client'

// RatingField — a 1–5 star rating input wired to react-hook-form. Mirrors the
// ColorField pattern (Controller + button grid + FieldWrapper) for the unified
// form engine's `rating_5` response type. Stores a number 1–5 (or null).

import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldWrapper } from './form-shell'

export function RatingField<T extends FieldValues>({
  name,
  label,
  required,
  span,
  max = 5,
}: {
  name: Path<T>
  label?: string
  required?: boolean
  span?: 'full'
  max?: number
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined
  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const current = typeof field.value === 'number' ? field.value : 0
          return (
            <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
              {stars.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={current === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onClick={() => field.onChange(current === n ? null : n)}
                  className="rounded p-0.5 text-amber-500 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star className={cn('size-6', n <= current ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                </button>
              ))}
              {current > 0 && (
                <button
                  type="button"
                  onClick={() => field.onChange(null)}
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )
        }}
      />
    </FieldWrapper>
  )
}
