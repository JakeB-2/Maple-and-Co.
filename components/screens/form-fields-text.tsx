'use client'

// Plain-text family of field primitives: TextField, TextareaField, NumberField,
// CheckboxField, FileField. Kept on its own so simple text-only forms (the
// majority of /new pages) don't pull in react-day-picker (DateField) or
// @base-ui/react Combobox (SelectField/ComboboxField).

import { type ReactNode } from 'react'
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FieldWrapper } from './form-shell'

// TextField
export function TextField<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  span,
  type = 'text',
  maxLength,
  inputClassName,
  autoFocus,
  locked,
  lockReason,
}: {
  name: Path<T>
  label?: string
  placeholder?: string
  required?: boolean
  span?: 'full'
  type?: React.HTMLInputTypeAttribute
  /** HTML maxlength — caps user entry. Pair with a Zod max in the schema. */
  maxLength?: number
  /** Tailwind classes applied to the underlying <Input>. Useful to cap width
   *  for short inputs (e.g. `max-w-[24ch]`). */
  inputClassName?: string
  /** Focus on mount — used for the primary name field on drawer open. */
  autoFocus?: boolean
  /** Render read-only with a lock glyph. Uses `readOnly` (not `disabled`) so the
   *  unchanged value is still submitted — required schemas stay satisfied and
   *  the server sees the name unchanged. Used for system-pinned names (renaming
   *  would break a code lookup) where the rest of the form stays editable. */
  locked?: boolean
  /** Tooltip/caption explaining why the field is locked. */
  lockReason?: string
}) {
  const { register, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <div className="relative">
        <Input
          id={name as string}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          className={locked ? `bg-muted pr-9 text-muted-foreground ${inputClassName ?? ''}` : inputClassName}
          autoFocus={autoFocus}
          required={required}
          readOnly={locked}
          aria-readonly={locked || undefined}
          tabIndex={locked ? -1 : undefined}
          title={locked ? lockReason : undefined}
          {...register(name)}
        />
        {locked && (
          <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      {locked && lockReason && (
        <p className="mt-1 text-xs text-muted-foreground">{lockReason}</p>
      )}
    </FieldWrapper>
  )
}

// TextareaField
export function TextareaField<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  span,
  rows = 3,
}: {
  name: Path<T>
  label?: string
  placeholder?: string
  required?: boolean
  span?: 'full'
  rows?: number
}) {
  const { register, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Textarea id={name as string} placeholder={placeholder} rows={rows} required={required} {...register(name)} />
    </FieldWrapper>
  )
}

// NumberField
export function NumberField<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  span,
  min,
  max,
  step,
  nullable,
  autoFocus,
  inputMode = 'decimal',
}: {
  name: Path<T>
  label?: string
  placeholder?: string
  required?: boolean
  span?: 'full'
  min?: number
  max?: number
  step?: number | 'any'
  nullable?: boolean
  /** Focus on mount. Usually unnecessary — AppForm auto-focuses the first
   *  field — but set it to claim focus for a specific number field. */
  autoFocus?: boolean
  /** Soft-keyboard hint on mobile. Defaults to 'decimal' (number pad with a
   *  decimal point); pass 'numeric' for integer-only fields. The keyboard only
   *  pops on its own from a user tap on iOS — see useAutoFocusFirstField. */
  inputMode?: 'decimal' | 'numeric'
}) {
  const { register, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Input
        id={name as string}
        type="number"
        inputMode={inputMode}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        required={required}
        {...register(
          name,
          nullable
            ? { setValueAs: (v) => (v === '' ? null : Number(v)) }
            : { valueAsNumber: true },
        )}
      />
    </FieldWrapper>
  )
}

// CheckboxField — shadcn Checkbox for boolean fields
export function CheckboxField<T extends FieldValues>({
  name,
  label,
  labelAccessory,
}: {
  name: Path<T>
  label?: string
  labelAccessory?: ReactNode
}) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={name as string}
            checked={!!field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
          <Label htmlFor={name as string} className="text-sm cursor-pointer font-normal">
            {label}
          </Label>
          {labelAccessory}
        </div>
      )}
    />
  )
}

// FileField
export function FileField<T extends FieldValues>({
  name,
  label,
  accept,
  multiple,
  required,
  span,
}: {
  name: Path<T>
  label?: string
  accept?: string
  multiple?: boolean
  required?: boolean
  span?: 'full'
}) {
  const { register, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} error={error} required={required} span={span} htmlFor={name as string}>
      <Input
        id={name as string}
        type="file"
        accept={accept}
        multiple={multiple}
        className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
        {...register(name)}
      />
    </FieldWrapper>
  )
}
