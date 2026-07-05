// "Who" rendered as color, app-wide (design brief: signature colors carry
// identity; names appear only when space allows).

import { cn } from '@/lib/utils'

export function AvatarChip({
  name,
  color,
  size = 'md',
  withName = false,
  className,
}: {
  name: string
  color: string
  size?: 'sm' | 'md'
  withName?: boolean
  className?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const dot = (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' ? 'size-5 text-[0.6rem]' : 'size-7 text-xs'
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  )

  if (!withName) {
    return (
      <span title={name} className={className}>
        {dot}
        <span className="sr-only">{name}</span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {dot}
      <span className={cn('font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>{name}</span>
    </span>
  )
}
