// StatusBadge — shared rectangle badge primitive for entity lifecycle states.
//
// Before this existed each domain (bookings, tasks, shipments, allocations,
// work entries, …) had its own colour table inline, so the same logical state
// looked subtly different across lists, drawers, and side rails. This
// primitive collapses the visual treatment onto seven semantic state groups
// that every entity should be able to map onto:
//
//   draft     → grey, low-emphasis. Pre-publication / pre-submit / pre-active.
//   active    → blue. The "working on it" state.
//   pending   → amber. Awaiting another actor (review, payment, return).
//   blocked   → red. Something needs human intervention before progress.
//   complete  → green. Successful terminal state.
//   cancelled → muted red/red. Aborted before completion.
//   archived  → muted grey. Soft-closed / hidden but recoverable.
//
// The domain badge wrappers (BookingStatusBadge, TaskStatusBadge, etc.) own
// the mapping from their entity-specific status to one of these groups, and
// the label rendered inside the badge. This primitive owns the colours and
// sizing — nothing else.

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge, type BadgeVariant } from '@/components/ui/badge'

export type StatusGroup =
  | 'draft'
  | 'active'
  | 'pending'
  | 'blocked'
  | 'complete'
  | 'cancelled'
  | 'archived'

const GROUP_VARIANTS: Record<StatusGroup, BadgeVariant> = {
  draft:     'muted',
  active:    'info',
  pending:   'warning',
  blocked:   'destructive',
  complete:  'success',
  cancelled: 'destructive',
  archived:  'muted',
}

// Left-edge accent colour for a status group — the row-stripe counterpart of
// the badge. Same semantic mapping as GROUP_VARIANTS so a list row's stripe and
// its status badge always agree. Feed the return value to DataTable's
// `rowAccent` prop. Neutral groups (draft/archived) use the strong border so the
// stripe reads as "no active status" rather than a colour with meaning.
const GROUP_ACCENTS: Record<StatusGroup, string> = {
  draft:     'var(--border-strong)',
  active:    'var(--color-info)',
  pending:   'var(--color-warning)',
  blocked:   'var(--color-danger)',
  complete:  'var(--color-success)',
  cancelled: 'var(--color-danger)',
  archived:  'var(--border-strong)',
}

export function statusGroupAccent(group: StatusGroup): string {
  return GROUP_ACCENTS[group]
}

export type StatusBadgeSize = 'sm' | 'md'

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  sm: 'h-5 px-1.5 text-micro',
  md: 'h-[22px] px-2 text-xs',
}

export function StatusBadge({
  group,
  children,
  size = 'md',
  className,
  title,
}: {
  group: StatusGroup
  children: React.ReactNode
  size?: StatusBadgeSize
  className?: string
  title?: string
}) {
  return (
    <Badge
      variant={GROUP_VARIANTS[group]}
      title={title}
      className={cn(
        'tabular-nums',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// ProgressStatusBar — multi-step lifecycle indicator.
//
// Renders ordered badges with the current step coloured by its StatusGroup and
// previous steps muted-complete. Shipments use this for pending → in_transit
// → delivered; counting reports for open → counting → submitted → approved.
// Quantitative progress (e.g. resolution X of Y) belongs in a different
// primitive — this one is for ordered lifecycles only.
// ---------------------------------------------------------------------------

export type ProgressStep = {
  /** Stable id; matches against currentStepId. */
  id: string
  label: string
  /** Optional override; defaults to derived state per currentStepId. */
  group?: StatusGroup
}

export function ProgressStatusBar({
  steps,
  currentStepId,
  className,
}: {
  steps: ReadonlyArray<ProgressStep>
  currentStepId: string
  className?: string
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  return (
    <ol className={cn('flex flex-wrap items-center gap-1 gap-y-1 text-micro font-medium', className)}>
      {steps.map((step, i) => {
        let group: StatusGroup
        if (step.group) group = step.group
        else if (currentIndex < 0)       group = 'archived'
        else if (i < currentIndex)       group = 'complete'
        else if (i === currentIndex)     group = 'active'
        else                              group = 'archived'

        return (
          <li key={step.id} className="flex items-center gap-1">
            <StatusBadge group={group} size="sm">{step.label}</StatusBadge>
            {i < steps.length - 1 && (
              <span aria-hidden className="text-muted-foreground">›</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
