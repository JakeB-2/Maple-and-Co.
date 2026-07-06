'use client'

// The single shared quick-capture FAB (R4, repositioned in M6/D-033). Lives in
// the app shell so capture is reachable from EVERY screen. Now bottom-CENTER —
// the primary thumb zone, floating above the middle of the 5-icon bar — since
// the bar's last slot became the More hamburger. Tapping opens a chooser; each
// tile routes to that surface's URL-driven create drawer, so the FAB itself
// carries no per-hub data. The FAB is capture, not nav: Finance and Groceries
// left the bottom bar but their capture stays reachable here.
//
// Hidden on focused / non-capture surfaces: shopping mode (its own fixed cart
// bar sits exactly where the FAB would) and the settings-style config pages.

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Coins, Leaf, ListChecks, PawPrint, Plus, ShoppingBasket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerShell } from '@/components/screens/detail-drawer'
import { FormDrawerChrome } from '@/components/screens/form-drawer'

// Each tile routes to a surface's create drawer. Pet/Plant logs have no single
// "new" row — /pets?capture=1 resolves to the entity's type picker (redirects
// straight to the profile when only one pet/plant exists). Groceries capture is
// the add box on the list itself (D-022: no ?new=1 form there).
const CAPTURE_TYPES = [
  { href: '/finance?new=1', label: 'Finance', icon: Coins },
  { href: '/pets?capture=1', label: 'Pet log', icon: PawPrint },
  { href: '/plants?capture=1', label: 'Plant log', icon: Leaf },
  { href: '/tasks?new=1', label: 'Task', icon: ListChecks },
  { href: '/calendar?new=1', label: 'Event', icon: CalendarDays },
  { href: '/groceries', label: 'Groceries', icon: ShoppingBasket },
] as const

// Surfaces where a capture FAB doesn't belong or collides with fixed chrome.
const HIDE_ON = [
  '/household',
  '/groceries/shop',
  '/groceries/stores',
  '/pets/types',
  '/plants/types',
  '/finance/categories',
]

export function CaptureFab() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (HIDE_ON.some((base) => pathname === base || pathname.startsWith(`${base}/`))) {
    return null
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-lg justify-center px-4">
        <Button
          size="lg"
          className="pointer-events-auto rounded-full shadow-lg"
          aria-label="Quick capture"
          onClick={() => setOpen(true)}
        >
          <Plus /> Add
        </Button>
      </div>

      <DrawerShell
        open={open}
        onOpenChange={setOpen}
        mobilePresentation="bottom"
        size="sm"
        title="Quick capture"
      >
        <FormDrawerChrome mode="create" title="Quick capture" subtitle="What are you logging?">
          <div className="grid grid-cols-2 gap-2 pb-2">
            {CAPTURE_TYPES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-20 touch:min-h-24 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-center text-sm font-medium transition-colors hover:bg-surface-2"
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </FormDrawerChrome>
      </DrawerShell>
    </>
  )
}
