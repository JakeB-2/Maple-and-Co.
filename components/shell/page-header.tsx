// The one page header (D-033): every route under (app) renders exactly one of
// these as its first child — title, optional one-line subtitle, optional
// trailing actions (usually a HeaderMenu). Replaces the two hand-rolled inline
// <h1> patterns that had drifted across pages. backHref is for drill-down
// sub-pages only (a store's sections, a type's fields) where the bottom nav
// can't take you back up one level.

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: {
  title: React.ReactNode
  subtitle?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2">
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <h1 className={cn('text-2xl font-bold tracking-tight', backHref && 'mt-1')}>{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </header>
  )
}
