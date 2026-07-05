'use client'

// FAB + bottom-sheet type picker — the 2-tap capture path: FAB -> tile -> the
// quick-log drawer (?new_log=<typeId>). The sheet is plain client state; only
// the picked type reaches the URL. `new_log` (not `log`) so the drawer grammar
// strips it on the post-save redirect — otherwise the empty form re-opens over
// the fresh event's detail.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PawPrint } from 'lucide-react'
import type { PetEventTypeRow } from '@/lib/queries/pet-event-types'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function QuickLog({ types }: { types: PetEventTypeRow[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const layer = useDrawerNavHref()

  function pick(typeId: string) {
    setOpen(false)
    router.push(layer(`/maple?new_log=${typeId}`))
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-lg justify-end px-4">
        <Button
          size="lg"
          className="pointer-events-auto rounded-full shadow-lg"
          aria-label="Log a Maple event"
          onClick={() => setOpen(true)}
        >
          <PawPrint /> Log
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>What happened?</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => pick(type.id)}
                className="flex min-h-20 touch:min-h-24 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-center text-sm transition-colors hover:bg-surface-2"
              >
                <span className="text-2xl" aria-hidden>
                  {type.emoji}
                </span>
                {type.name}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
