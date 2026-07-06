'use client'

// The Maple type picker — a bottom-sheet grid of event-type tiles, on the app's
// DrawerShell chrome like every other drawer (no more hand-rolled <Sheet>).
//
// It has NO FAB of its own: the single shared shell FAB (components/shell/
// capture-fab) opens it from anywhere by routing to /maple?capture=1. The shell
// has no pet data, so it just sets the param and this on-page component — which
// DOES have the pet + types — owns the tiles.
//
// Two paths on tile tap:
//   - a type WITH a required attribute opens the full log form (?new_log=<id>);
//     the log can't be completed without that input.
//   - a type with NO required attribute is written IMMEDIATELY with defaults
//     (the brief's "tiles → done" 2-tap), surfaced with a 15s Undo toast that
//     soft-deletes the fresh event. Instant write over review is the whole point.
//
// `new_log` (not `log`) so the drawer grammar strips it on the post-save
// redirect — otherwise the empty form re-opens over the fresh event's detail.

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { PetEventTypeRow } from '@/lib/queries/pet-event-types'
import { logPetEvent } from '@/lib/actions/pet-events'
import { softDelete } from '@/lib/actions/soft-delete'
import { isRecordStateParam } from '@/lib/nav/preserve-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { DrawerShell } from '@/components/screens/detail-drawer'
import { FormDrawerChrome } from '@/components/screens/form-drawer'

export function QuickLog({
  types,
  requiredTypeIds,
  petId,
  currentUserId,
  captureParam,
}: {
  types: PetEventTypeRow[]
  /** Type ids with ≥1 required attribute — these open the full form instead. */
  requiredTypeIds: string[]
  petId: string
  currentUserId: string
  /** '1' when the picker should be open (?capture=1), else null. */
  captureParam: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { refreshNow } = useMutationRefresh()
  const [, startTransition] = useTransition()
  const requiresForm = new Set(requiredTypeIds)

  /** Current query minus `?capture` (+ any extra mutation), as a maple href. */
  function hrefWithoutCapture(mutate?: (params: URLSearchParams) => void): string {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('capture')
    mutate?.(params)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function pick(type: PetEventTypeRow) {
    if (requiresForm.has(type.id)) {
      // Needs input — open the full form. Clear any open drawer + our transient
      // ?capture, then set new_log (which closes this picker on its own).
      const href = hrefWithoutCapture((params) => {
        for (const key of new Set(params.keys())) {
          if (isRecordStateParam(key)) params.delete(key)
        }
        params.set('new_log', type.id)
      })
      router.push(href)
      return
    }
    autoLog(type)
  }

  function autoLog(type: PetEventTypeRow) {
    // Close the picker optimistically; the write + undo happen behind it.
    router.replace(hrefWithoutCapture())
    startTransition(async () => {
      const result = await logPetEvent({
        pet_id: petId,
        event_type_id: type.id,
        occurred_at: new Date().toISOString(),
        done_by_user_id: currentUserId,
        note: null,
        values: [],
      })
      // `error: null` is the success discriminant — narrow on it so result.data
      // is non-null below (a truthy check wouldn't exclude the error variant).
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      refreshNow()
      const eventId = result.data.id
      toast.success(`${type.emoji} ${type.name} logged 🐾`, {
        duration: 15000,
        action: {
          label: 'Undo',
          onClick: async () => {
            const undo = await softDelete('pet_events', eventId)
            if (undo.error) {
              toast.error(`Couldn't undo: ${undo.error}`)
              return
            }
            toast.success('Removed')
            refreshNow()
          },
        },
      })
    })
  }

  return (
    <DrawerShell
      paramKey="capture"
      paramValue={captureParam}
      mobilePresentation="bottom"
      size="sm"
      title="What happened?"
    >
      <FormDrawerChrome mode="create" title="What happened?">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => pick(type)}
              className="flex min-h-20 touch:min-h-24 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-center text-sm transition-colors hover:bg-surface-2"
            >
              <span className="text-2xl" aria-hidden>
                {type.emoji}
              </span>
              {type.name}
            </button>
          ))}
        </div>
      </FormDrawerChrome>
    </DrawerShell>
  )
}
