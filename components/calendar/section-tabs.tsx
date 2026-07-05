'use client'

// The Calendar tab hosts two screens — the month/agenda calendar and the tasks
// freshness board — switched by this segmented control (D-007's household
// rhythm lives across both). Active state is by pathname; both routes keep the
// Calendar tab lit in the bottom bar.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
] as const

export function SectionTabs() {
  const pathname = usePathname()

  return (
    <div
      role="tablist"
      aria-label="Calendar sections"
      className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1"
    >
      {SECTIONS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'flex min-h-10 touch:min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
