'use client'

// BrandColorField — free-form brand color picker.
// Allows any valid oklch / hex / rgb value (validated on blur via isValidColorString).
// Unlike ColorField (the 12-chip calendar palette), this accepts any designer-authored
// color. Renders: a live swatch, a text input, and an <input type="color"> native
// picker for hex quick-pick (toggled by a small icon button).
// The parent form handles live-preview wiring (document.documentElement.style.setProperty);
// this component is a pure controlled field — it does not call setProperty directly.

import { useId, useRef, useState } from 'react'
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { Pipette, X } from 'lucide-react'
import { FieldWrapper } from './form-shell'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Anchored color grammars — anything not matching is rejected. These cover the
// exact value shapes used by the design tokens (oklch / hex / rgb[a]); the anchors
// guarantee no trailing `; } …` can smuggle extra CSS if the value is ever
// inlined into a <style>. (Inlined here — no theme-validation module in this app.)
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const OKLCH = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.]+%?)?\s*\)$/
const RGB = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/

/** True only for a safe, self-contained color string (oklch / hex / rgb[a]). */
function isValidColorString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.length === 0 || v.length > 64) return false
  return HEX.test(v) || OKLCH.test(v) || RGB.test(v)
}

export function BrandColorField<T extends FieldValues>({
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
  const inputId = useId()
  const pickerRef = useRef<HTMLInputElement>(null)
  // Track picker open state so we can show the "hex only" note.
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={inputId}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const rawValue = (field.value as string | null | undefined) ?? ''
          const isValid = isValidColorString(rawValue)

          // Update the field; on blur let RHF validation run normally.
          function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
            field.onChange(e.target.value)
          }

          function handleTextBlur() {
            // Trim whitespace; leave validation to the Zod schema + RHF.
            const trimmed = rawValue.trim()
            if (trimmed !== rawValue) field.onChange(trimmed)
            field.onBlur()
          }

          function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
            // The native color picker always emits a 6-digit hex value (#rrggbb).
            field.onChange(e.target.value)
          }

          function handlePickerClick() {
            setPickerOpen(true)
            pickerRef.current?.click()
          }

          function handleClear() {
            field.onChange(null)
          }

          // Determine swatch background: show the color when valid, neutral otherwise.
          const swatchStyle: React.CSSProperties = isValid
            ? { background: rawValue }
            : { background: 'var(--muted)' }

          // The hex picker needs a valid 6-digit hex value as its `value` prop.
          // If the current value is a valid hex, use it; otherwise default to #000000
          // so the picker opens at a sensible start point rather than erroring.
          const pickerValue = /^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue : '#000000'

          return (
            <div className="flex items-center gap-2">
              {/* Live color swatch */}
              <span
                className="size-8 shrink-0 rounded-md border border-input"
                style={swatchStyle}
                aria-hidden
              />

              {/* Free-text input */}
              <Input
                id={inputId}
                value={rawValue}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                placeholder="oklch(0.6 0.14 195)"
                className={cn('flex-1', error && 'border-destructive')}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-err` : undefined}
              />

              {/* Native hex picker (hidden; triggered by button) */}
              <input
                ref={pickerRef}
                type="color"
                value={pickerValue}
                onChange={handlePickerChange}
                onBlur={() => setPickerOpen(false)}
                className="sr-only"
                aria-hidden
                tabIndex={-1}
              />

              {/* Picker toggle button */}
              <button
                type="button"
                onClick={handlePickerClick}
                className="flex size-8 touch:size-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open color picker (hex only)"
                title="Open native color picker — hex values only"
              >
                <Pipette className="size-3.5" />
              </button>

              {/* Clear button — only shown when a value exists */}
              {rawValue && rawValue !== '' && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex size-8 touch:size-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear color"
                  title="Clear color override"
                >
                  <X className="size-3.5" />
                </button>
              )}

              {/* Hex-only note when the picker is open */}
              {pickerOpen && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">hex only</span>
              )}
            </div>
          )
        }}
      />
    </FieldWrapper>
  )
}
