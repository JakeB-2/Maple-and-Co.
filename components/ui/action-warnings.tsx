'use client'

import { useId, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// Shared surface for soft action warnings.
//
// Action returns warnings when something looks wrong but isn't invalid (e.g.
// counterparty mismatch, over-doc-balance). Caller renders the warnings,
// shows a force-override checkbox, and re-submits with `force: true` if the
// user accepts.
//
// Pattern (form):
//   const [warnings, setWarnings] = useState<ActionWarning[]>([])
//   const [force, setForce] = useState(false)
//
//   async function onSubmit(values) {
//     const res = await myAction({ ...values, force })
//     if (res.warnings && !res.error) { setWarnings(res.warnings); return }
//     if (res.error) { toast.error(res.error); return }
//     toast.success('Saved')
//   }
//
//   <ActionWarnings warnings={warnings} force={force} onForceChange={setForce} />

/**
 * Soft warning returned by a server action alongside a null error — "looks
 * wrong but isn't invalid" diagnostics. The UI shows these and allows a
 * force-override.
 *
 * `kind` is a narrow string per action so callers can switch on it; widen by
 * intersecting (`AllocationWarning = ActionWarning & { kind: 'over_balance' | ... }`).
 */
export type ActionWarning = {
  kind: string
  message: string
  meta?: Record<string, unknown>
}

export function ActionWarnings({
  warnings,
  force,
  onForceChange,
  forceLabel = 'I understand — proceed anyway',
  renderDetails,
}: {
  warnings: ActionWarning[]
  force: boolean
  onForceChange: (force: boolean) => void
  forceLabel?: string
  renderDetails?: (warning: ActionWarning) => ReactNode
}) {
  const forceId = useId()
  if (warnings.length === 0) return null

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
      <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
        {warnings.map((w, index) => (
          <li key={`${w.kind}:${index}`} className="space-y-2">
            <p>• {w.message}</p>
            {renderDetails?.(w)}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id={forceId}
          checked={force}
          onCheckedChange={(v) => onForceChange(v === true)}
        />
        <Label htmlFor={forceId} className="cursor-pointer text-sm">
          {forceLabel}
        </Label>
      </div>
    </div>
  )
}
