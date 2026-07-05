'use client'

// Generic page/section "more actions" overflow menu — a vertical-ellipsis
// trigger that opens a dropdown of secondary actions (links or click handlers).
//
// Use this anywhere you'd otherwise crowd a row of secondary buttons next to a
// primary CTA. The trigger sits flush with the surrounding action row (size
// matches the small Buttons used on list/dashboard headers). Centralising the
// pattern means visual tweaks land in one place when we restyle.
//
// Example:
//   <MoreActionsMenu
//     actions={[
//       { label: 'Edit Groups', href: '/tasks/groups' },
//       { label: 'Edit Tags',   href: '/tasks/tags' },
//     ]}
//   />

import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LockTooltip } from '@/components/ui/lock-reason'

export type MoreAction = {
  label: string
  /** Optional leading icon component (lucide). */
  icon?: React.ElementType
  /** Use either `href` (link) or `onSelect` (handler). */
  href?: string
  onSelect?: () => void
  disabled?: boolean
  /** Tooltip-rendered reason explaining the disabled state. */
  disabledReason?: string
  /** Render with destructive styling. */
  destructive?: boolean
}

export function MoreActionsMenu({
  actions,
  align = 'end',
  size = 'sm',
  triggerLabel = 'More actions',
  className,
}: {
  actions: MoreAction[]
  /** Where the dropdown anchors. */
  align?: 'start' | 'end' | 'center'
  /** Button size — match the surrounding action row. */
  size?: 'sm' | 'default' | 'lg'
  /** Accessible name on the trigger button. */
  triggerLabel?: string
  className?: string
}) {
  if (actions.length === 0) return null
  const triggerSize = size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={triggerSize} className={className}>
          <MoreVertical className="size-4" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-56">
        {actions.map((a, i) => {
          const Icon = a.icon
          const itemClass = a.destructive
            ? 'text-destructive focus:text-destructive'
            : undefined
          const isDisabled = !!a.disabled || !!a.disabledReason
          const inner = (
            <>
              {Icon && <Icon className="size-4" />}
              {a.label}
            </>
          )
          const item = a.href ? (
            <DropdownMenuItem key={i} asChild disabled={isDisabled} className={itemClass}>
              <Link href={a.href}>{inner}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={i}
              onSelect={a.onSelect}
              disabled={isDisabled}
              className={itemClass}
            >
              {inner}
            </DropdownMenuItem>
          )
          if (a.disabledReason) {
            return (
              <LockTooltip key={i} reason={a.disabledReason}>
                {item}
              </LockTooltip>
            )
          }
          return item
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
