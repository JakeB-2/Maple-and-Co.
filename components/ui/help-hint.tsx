'use client'

// Small "?" icon that sits beside a form label / cell header / inline phrase.
// Click it to pop a help bubble; click the X (or anywhere outside) to dismiss.
//
// Usage:
//   <Label>
//     Landed cost (USD)
//     <HelpHint>Derived from the freight bill's captured rate.</HelpHint>
//   </Label>
//
//   <HelpHint title="Functional currency">
//     All inventory and reporting are kept in USD…
//   </HelpHint>

import { HelpCircle, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md'

const ICON_BY_SIZE: Record<Size, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

export function HelpHint({
  children,
  title,
  size = 'sm',
  className,
  ariaLabel = 'Show help',
}: {
  children: React.ReactNode
  title?: string
  size?: Size
  className?: string
  /** Override the trigger button's accessible label. Default: "Show help". */
  ariaLabel?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <HelpCircle className={ICON_BY_SIZE[size]} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="relative w-72 gap-2 pr-8 text-sm leading-relaxed"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {title && <div className="font-medium text-foreground">{title}</div>}
        <div className="text-muted-foreground">{children}</div>
        <PopoverPrimitive.Close
          aria-label="Close help"
          className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </PopoverPrimitive.Close>
      </PopoverContent>
    </Popover>
  )
}
