import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Field — the single "label + value" row primitive (Phase 2B).
//
// Collapses three near-duplicates that drifted apart as the app grew:
//   DetailField  (inline, value right-aligned)        — components/screens/detail.tsx
//   FieldRow     (inline, fixed 5.5rem label column)  — components/screens/field-row.tsx
//   DrawerField  (stacked, uppercase eyebrow label)   — components/screens/detail-drawer.tsx
// Those three now delegate here, so styling/spacing/type live in ONE place.
// Phase 3 migrates call sites to <Field> directly and retires the wrappers.
//
// Layouts:
//   orientation="inline" (default)
//     align="between"  — label left, value right-aligned    (was DetailField)
//     align="columns"  — fixed label column, value left      (was FieldRow)
//   orientation="stacked" — uppercase eyebrow label over value (was DrawerField)
//
// All text is on the type scale: labels use text-body (inline) / text-eyebrow
// (stacked); values use text-body.
// ---------------------------------------------------------------------------

export type FieldProps = {
  label: ReactNode
  children: ReactNode
  orientation?: 'inline' | 'stacked'
  /** inline only — how the value sits relative to the label. */
  align?: 'between' | 'columns'
  /** inline only — top-align label + value for multi-line values. */
  alignTop?: boolean
  /** Connects a <label> to an input for click-to-focus / a11y. */
  htmlFor?: string
  /** stacked only — render the value in monospace (ids, references). */
  mono?: boolean
  /** stacked only — span the full width of a form grid. */
  full?: boolean
  /** inline only — hairline divider below the row (default true). */
  divided?: boolean
  className?: string
  labelClassName?: string
  valueClassName?: string
}

// One canonical eyebrow/overline treatment, shared with the rest of the
// vocabulary: 11px, 600, uppercase, 0.06em tracking, muted.
const EYEBROW = 'text-eyebrow font-semibold uppercase tracking-[0.06em] text-muted-foreground'

export function Field({
  label,
  children,
  orientation = 'inline',
  align = 'between',
  alignTop = false,
  htmlFor,
  mono = false,
  full = false,
  divided = true,
  className,
  labelClassName,
  valueClassName,
}: FieldProps) {
  // Stacked — eyebrow label over value (drawer form grids).
  if (orientation === 'stacked') {
    const labelEl = htmlFor ? (
      <label htmlFor={htmlFor} className={cn(EYEBROW, labelClassName)}>{label}</label>
    ) : (
      <div className={cn(EYEBROW, labelClassName)}>{label}</div>
    )
    return (
      <div className={cn('flex flex-col gap-0.5', full && 'col-span-full', className)}>
        {labelEl}
        <div className={cn('text-body', mono && 'font-mono text-dense', valueClassName)}>
          {children}
        </div>
      </div>
    )
  }

  // Inline — label + value on one row, self-dividing.
  const labelEl = htmlFor ? (
    <label htmlFor={htmlFor} className={cn('text-body text-muted-foreground', alignTop && 'pt-1', labelClassName)}>
      {label}
    </label>
  ) : (
    <div className={cn('text-body text-muted-foreground', alignTop && 'pt-1', labelClassName)}>{label}</div>
  )

  if (align === 'columns') {
    return (
      <div
        className={cn(
          'grid min-h-9 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-3 py-2',
          divided && 'border-b last:border-b-0',
          alignTop ? 'items-start' : 'items-center',
          className,
        )}
      >
        {labelEl}
        <div className={cn('min-w-0 text-body font-medium', valueClassName)}>{children}</div>
      </div>
    )
  }

  // align === 'between'
  return (
    <div
      className={cn(
        'flex min-h-9 justify-between gap-3 px-3 py-2',
        divided && 'border-b last:border-b-0',
        alignTop ? 'items-start' : 'items-center',
        className,
      )}
    >
      {labelEl}
      <div className={cn('min-w-0 text-right text-body font-medium text-foreground', valueClassName)}>
        {children}
      </div>
    </div>
  )
}
