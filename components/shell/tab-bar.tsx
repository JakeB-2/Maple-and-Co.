'use client'

// Bottom navigation, driven by lib/nav/nav-config.ts (D-033): four bar items
// (Calendar, Pets, Today center, Plants) + the More hamburger in the fifth
// slot, which opens an upward-expanding menu of the remaining destinations
// (Finance, Groceries, Tasks, Household). Moving an item between bar and menu
// is a one-line placement flip in the config — this component never changes.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { barItems, isNavActive, menuItems } from '@/lib/nav/nav-config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const tabClass = (active: boolean) =>
  cn(
    'flex min-h-14 touch:min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors',
    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  )

export function TabBar() {
  const pathname = usePathname()
  const menu = menuItems()
  const menuActive = menu.some((item) => isNavActive(pathname, item))

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {/* Column count follows the config (barItems + More) so a placement flip
          in nav-config really is a one-line change. */}
      <div className="mx-auto grid w-full max-w-lg grid-flow-col auto-cols-fr">
        {barItems().map((item) => {
          const active = isNavActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={tabClass(active)}
            >
              <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
              {item.label}
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger className={tabClass(menuActive)} aria-label="More actions">
            <Menu className="size-5" aria-hidden strokeWidth={menuActive ? 2.4 : 1.8} />
            More
          </DropdownMenuTrigger>
          {/* side=top makes the list expand upward from the bar (no sidebar). */}
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-52">
            {menu.map((item) => {
              const Icon = item.icon
              const active = isNavActive(pathname, item)
              return (
                <DropdownMenuItem key={item.key} asChild>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex min-h-11 items-center gap-2', active && 'text-primary')}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
