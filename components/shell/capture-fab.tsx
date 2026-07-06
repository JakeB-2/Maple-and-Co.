'use client'

// The single shared quick-capture FAB (R4). Lives in the app shell so capture
// is reachable from EVERY screen — including Today (the PWA start_url), which
// had no capture affordance and forced a tab-nav before any log. Tapping opens
// a chooser; each tile routes to that surface's URL-driven create drawer, so the
// FAB itself carries no per-hub data. Replaces the old per-page FABs (spend
// list, calendar, tasks, Maple quick-log) — one FAB, one grammar, no stacking.
//
// Hidden on focused / non-capture surfaces: shopping mode (its own fixed cart
// bar sits exactly where the FAB would) and settings (configuration, not capture).

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Coins, ListChecks, PawPrint, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerShell } from '@/components/screens/detail-drawer'
import { FormDrawerChrome } from '@/components/screens/form-drawer'

// Each tile routes to a surface's create drawer. Maple has no single "new" row —
// it opens its type picker (?capture=1, owned by components/maple/quick-log).
const CAPTURE_TYPES = [
  { href: '/spending?new=1', label: 'Spend', icon: Coins },
  { href: '/maple?capture=1', label: 'Maple', icon: PawPrint },
  { href: '/tasks?new=1', label: 'Task', icon: ListChecks },
  { href: '/calendar?new=1', label: 'Event', icon: CalendarDays },
] as const

// Surfaces where a capture FAB doesn't belong or collides with fixed chrome.
const HIDE_ON = ['/settings', '/groceries/shop']

export function CaptureFab() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (HIDE_ON.some((base) => pathname === base || pathname.startsWith(`${base}/`))) {
    return null
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-lg justify-end px-4">
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
        <FormDrawerChrome mode="create" title="Add to Maple & Co" subtitle="What are you logging?">
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
