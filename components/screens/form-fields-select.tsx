'use client'

// Select-family field primitives: SelectField (Radix Select) and ComboboxField
// (@base-ui/react Combobox — the searchable variant). Isolated from form-shell
// so pages that only need text/checkbox/date fields don't pull in base-ui.

import { useContext, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FieldWrapper } from './form-shell'
import { DrawerPortalContext } from './detail-drawer'

// Sentinel used internally by SelectField when allowNone is set.
// Selecting this item clears the field value back to ''.
const NONE_SENTINEL = '__none__'

// Read-only display used by both SelectField and ComboboxField when locked.
// Renders a styled, non-interactive control showing the resolved label + a
// lock icon (with optional tooltip). Click/keyboard does nothing — the field's
// react-hook-form value is unchanged because no input is rendered.
function LockedFieldDisplay({
  id,
  label,
  reason,
}: {
  id: string
  label: string
  reason?: string
}) {
  const inner = (
    <div
      id={id}
      role="textbox"
      aria-readonly="true"
      aria-disabled="true"
      tabIndex={0}
      className="flex h-9 w-full cursor-not-allowed items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-1 text-sm text-muted-foreground select-none"
    >
      <span className="truncate">{label || '—'}</span>
      <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
  )
  if (!reason) return inner
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// SelectField
export function SelectField<T extends FieldValues>({
  name,
  label,
  labelAccessory,
  placeholder,
  options,
  required,
  span,
  allowNone,
  locked,
  lockReason,
  triggerSize,
  autoFocus,
}: {
  name: Path<T>
  label?: string
  labelAccessory?: ReactNode
  placeholder?: string
  options: { label: string; value: string; disabledReason?: string | null }[]
  required?: boolean
  span?: 'full'
  /** When set, prepends a "clear" option with this label (e.g. "—"). Clicking it resets the field to empty. */
  allowNone?: string
  /** When true, render a read-only display showing the current value and a lock icon. */
  locked?: boolean
  /** Optional tooltip shown on hover when locked; explains why the field can't be changed. */
  lockReason?: string
  /** 'sm' renders a shorter (h-7) trigger to match dense fact-row layouts. */
  triggerSize?: 'sm' | 'default'
  autoFocus?: boolean
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined

  return (
    <FieldWrapper label={label} labelAccessory={labelAccessory} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          if (locked) {
            const selectedLabel = options.find((o) => o.value === field.value)?.label ?? ''
            return <LockedFieldDisplay id={name as string} label={selectedLabel} reason={lockReason} />
          }
          return (
            // Use undefined (not '') when no value so Radix shows the placeholder,
            // not a selected-but-blank state.
            <Select
              value={field.value || undefined}
              onValueChange={(val) => field.onChange(val === NONE_SENTINEL ? '' : val)}
            >
              <SelectTrigger
                id={name as string}
                size={triggerSize}
                className="w-full"
                autoFocus={autoFocus}
                aria-required={required || undefined}
                data-autofocus-required={required ? 'true' : undefined}
                data-autofocus-filled={field.value ? 'true' : 'false'}
              >
                <SelectValue placeholder={placeholder ?? (label ? `Select ${label.toLowerCase()}` : 'Select…')} />
              </SelectTrigger>
              <SelectContent>
                {allowNone && (
                  <SelectItem value={NONE_SENTINEL}>{allowNone}</SelectItem>
                )}
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value} disabled={!!o.disabledReason}>
                    <span className="flex min-w-0 flex-col items-start">
                      <span className="truncate">{o.label}</span>
                      {o.disabledReason && (
                        <span className="text-micro leading-snug text-muted-foreground">
                          {o.disabledReason}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }}
      />
    </FieldWrapper>
  )
}

// ComboboxField — searchable dropdown backed by react-hook-form
export function ComboboxField<T extends FieldValues>({
  name,
  label,
  labelAccessory,
  placeholder,
  options,
  required,
  span,
  portalContainer,
  locked,
  lockReason,
  triggerSize,
}: {
  name: Path<T>
  label?: string
  labelAccessory?: ReactNode
  placeholder?: string
  options: { label: string; value: string }[]
  required?: boolean
  span?: 'full'
  /**
   * Optional Sheet/Dialog content node. When this Combobox is rendered inside
   * a Radix Dialog focus trap (i.e. inside a Sheet), pass that container so
   * clicks on the popup register inside the trap. Without this, base-ui
   * portals to <body> and the Dialog's focus trap eats the click.
   *
   * If omitted, falls back to DrawerPortalContext — FormDrawer/DetailDrawer
   * publish their scroll body there, so most callers don't need to thread
   * this prop manually.
   */
  portalContainer?: HTMLElement | null
  /** When true, render a read-only display showing the current value and a lock icon. */
  locked?: boolean
  /** Optional tooltip shown on hover when locked; explains why the field can't be changed. */
  lockReason?: string
  /** 'sm' renders a shorter (h-7) input to match dense fact-row / inline layouts. */
  triggerSize?: 'sm' | 'default'
}) {
  const { control, formState: { errors } } = useFormContext<T>()
  const error = errors[name]?.message as string | undefined
  const drawerContainer = useContext(DrawerPortalContext)
  const container = portalContainer ?? drawerContainer

  return (
    <FieldWrapper label={label} labelAccessory={labelAccessory} error={error} required={required} span={span} htmlFor={name as string}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          if (locked) {
            const selectedLabel = options.find((o) => o.value === field.value)?.label ?? ''
            return <LockedFieldDisplay id={name as string} label={selectedLabel} reason={lockReason} />
          }
          return (
            <Combobox
              value={field.value || null}
              onValueChange={(val) => field.onChange(val ?? '')}
              items={options}
              // base-ui calls itemToStringLabel in two contexts:
              //   1. With the selected value (string UUID) — to populate the input display.
              //   2. With each item from `items` (Option objects) — to run the filter query.
              itemToStringLabel={(val) =>
                typeof val === 'object' && val !== null
                  ? (val as { label: string }).label
                  : options.find((o) => o.value === val)?.label ?? ''
              }
            >
              <ComboboxInput
                id={name as string}
                placeholder={placeholder ?? (label ? `Search ${label.toLowerCase()}…` : 'Search…')}
                showClear
                className={triggerSize === 'sm' ? 'h-7 [&_input]:h-7 [&_input]:text-sm' : undefined}
              />
              <ComboboxContent container={container ?? undefined}>
                <ComboboxEmpty>No results found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: { value: string; label: string }) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          )
        }}
      />
    </FieldWrapper>
  )
}
