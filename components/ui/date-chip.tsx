'use client'

// Boxless inline date cell. Plain tabular text with a trailing chevron and a
// soft hover fill so it clearly reads as a clickable control that opens a
// calendar. An inherited segment renders muted. Presentation only — the caller
// owns the popover + calendar and the click semantics.

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DateChip = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { inherited?: boolean; boxed?: boolean }
>(function DateChip({ inherited = false, boxed = false, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-inherited={inherited || undefined}
      className={cn(
        boxed
          // Boxed variant — reads as a white input (bg-card + border) so the
          // field boundary is obvious inside forms.
          ? 'inline-flex h-7 touch:h-9 max-w-full items-center gap-1 rounded-md border border-input bg-card px-2 text-left text-sm tabular-nums shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
          // -mx-1 px-1 gives a hover/focus target that fills the cell without
          // shifting the surrounding layout.
          : 'group/datechip -mx-1 inline-flex max-w-full items-center gap-0.5 rounded px-1 text-left text-sm tabular-nums outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60',
        inherited && 'text-muted-foreground',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        className="size-3 shrink-0 text-muted-foreground/70 transition-colors group-hover/datechip:text-foreground"
        aria-hidden
      />
    </button>
  )
})
