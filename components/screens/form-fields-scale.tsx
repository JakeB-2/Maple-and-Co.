'use client'

// ScaleField — a sliding-scale input wired to react-hook-form for the unified
// form engine's `scale` response type. Controlled Slider + live value readout,
// with optional end labels. Stores a number (or null when untouched).

import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { Slider } from '@/components/ui/slider'
import { FieldWrapper } from './form-shell'

export function ScaleField<T extends FieldValues>({
  name,
  label,
  required,
  span,
  min,
  max,
  step = 1,
  minLabel,
  maxLabel,
}: {
  name: Path<T>
  label?: string
  required?: boolean
  span?: 'full'
  min: number
  max: number
  step?: number
  minLabel?: string
  maxLabel?: string
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = typeof field.value === 'number' ? field.value : min
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Slider
                  min={min}
                  max={max}
                  step={step}
                  value={[value]}
                  onValueChange={(v) => field.onChange(v[0] ?? min)}
                  className="flex-1"
                />
                <span className="w-10 text-right text-sm font-medium tabular-nums">{value}</span>
              </div>
              {(minLabel || maxLabel) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minLabel}</span>
                  <span>{maxLabel}</span>
                </div>
              )}
            </div>
          )
        }}
      />
    </FieldWrapper>
  )
}
