'use client'

// Boxless inline dropdown. Shows its current value as muted text with a chevron
// that fades in on hover/focus, opening the same Radix Select menu used
// everywhere else. Use inside spreadsheet-like row grammars (e.g. booking
// assignment rows) where a boxed <SelectTrigger> would read as clutter.
//
// Presentation only — pass the SelectContent body (SelectItem / SelectGroup /
// empty state) as children and own the value/options yourself.

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'

export function InlineSelect({
  value,
  onValueChange,
  placeholder,
  ariaLabel,
  triggerClassName,
  contentClassName,
  align = 'start',
  boxed = false,
  children,
}: {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: React.ReactNode
  ariaLabel?: string
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  /** Boxed variant — keeps the standard white `bg-card` + border + visible
   *  chevron of a normal select (use inside forms where the input boundary
   *  should be obvious). Default is the boxless inline-text grammar. */
  boxed?: boolean
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          boxed
            // Keep SelectTrigger's white-box defaults (bg-card, border, shadow,
            // always-visible chevron); just fill the cell width.
            ? 'w-full min-w-0 font-normal'
            // Reads as plain text like the read-only detail rows — no box, no
            // fill. The chevron is hidden at rest, previews faintly when the row
            // is hovered, and brightens on direct hover / focus / open, so the
            // cell is discoverable as editable without looking like a button.
            // Touch devices have no hover, so on coarse pointers the chevron stays
            // faintly visible — otherwise the cell wouldn't read as editable.
            : 'h-6 w-full min-w-0 gap-1 rounded border-0 bg-transparent px-0 py-0 text-sm font-normal text-foreground shadow-none transition-colors focus-visible:ring-0 data-placeholder:text-muted-foreground dark:bg-transparent [&>svg]:opacity-0 [&>svg]:transition-opacity group-hover:[&>svg]:opacity-40 hover:[&>svg]:opacity-90 focus-visible:[&>svg]:opacity-90 data-[state=open]:[&>svg]:opacity-90 pointer-coarse:[&>svg]:opacity-50',
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align={align} className={contentClassName}>
        {children}
      </SelectContent>
    </Select>
  )
}
