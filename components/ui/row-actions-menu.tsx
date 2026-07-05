'use client'

// Per-row overflow menu — a small horizontal-ellipsis trigger that stays hidden
// until the row is hovered (or the trigger is focused / open), then reveals a
// dropdown of row-scoped actions. Used in the uniform single-line row grammar
// shared by the booking detail view and the assignment edit lists, where a row
// of inline buttons would break the column alignment.
//
// Touch devices have no hover, so on coarse pointers the trigger is always
// shown — otherwise the menu would be unreachable on a tablet.
//
// Pass DropdownMenuItem children directly; the parent owns the actions.

import * as React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function RowActionsMenu({
  children,
  label = 'Row actions',
  align = 'end',
  className,
}: {
  children: React.ReactNode
  label?: string
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'grid size-6 place-items-center rounded-sm text-muted-foreground opacity-0 transition-opacity outline-none hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100',
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
