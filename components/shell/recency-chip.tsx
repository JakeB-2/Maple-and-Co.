import Link from 'next/link'
import type { RecencyState } from '@/lib/queries/need-recency'
import { cn } from '@/lib/utils'

// Staleness fades, never shames (D-017): overdue dims, nothing goes red.
const STATE_CLASSES: Record<RecencyState, string> = {
  fresh: 'border-primary/40 bg-primary-soft',
  due: 'bg-surface-2',
  overdue: 'bg-surface-2 opacity-60',
  none: 'bg-surface-2',
}

type RecencyChipProps = {
  emoji: string
  label: string
  timeAgo: string | null
  state: RecencyState
  /** Link when present; plain pill when the chip already lives on its target page. */
  href?: string
}

export function RecencyChip({ emoji, label, timeAgo, state, href }: RecencyChipProps) {
  const className = cn(
    'inline-flex min-h-9 touch:min-h-10 items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
    STATE_CLASSES[state],
  )
  const content = (
    <>
      <span aria-hidden>{emoji}</span>
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{timeAgo ?? 'not yet'}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }
  return <span className={className}>{content}</span>
}
