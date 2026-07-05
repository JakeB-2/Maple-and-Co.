'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Coins, PawPrint, ShoppingBasket, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: 'Today', icon: Sun, match: ['/'] },
  { href: '/spending', label: 'Spend', icon: Coins, match: ['/spending'] },
  { href: '/groceries', label: 'Groceries', icon: ShoppingBasket, match: ['/groceries'] },
  { href: '/maple', label: 'Maple', icon: PawPrint, match: ['/maple'] },
  // Tasks shares the Calendar tab (segmented control inside the screen).
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, match: ['/calendar', '/tasks'] },
] as const

function isActive(pathname: string, match: readonly string[]) {
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = isActive(pathname, match)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 touch:min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
