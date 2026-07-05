// PreflightSummary — shared block for the dialog body of close/cancel/unlink/
// apply-style actions whose preview returns blockers, soft warnings, and an
// affected-rows summary.
//
// Before this primitive existed each action duplicated:
//   - a red box listing blockers (disables confirm)
//   - an amber box listing warnings (informational, may need force-override)
//   - an optional "affected rows" summary below
//
// This block standardises the visual treatment so preview-style actions share
// blocker / warning / summary chrome.
//
// Compose it inside the existing Dialog / Sheet — the primitive does not
// open a modal of its own. The parent owns confirm/cancel buttons and derives
// its own "has blockers" check (e.g. `(blockers?.length ?? 0) > 0`) to disable
// the confirm button.

import * as React from 'react'
import { ActionWarnings, type ActionWarning } from '@/components/ui/action-warnings'

export type PreflightItem = { message: React.ReactNode }

export function PreflightSummary({
  blockers,
  warnings,
  /** Inline soft warnings with the force-override checkbox (re-submit pattern). */
  softWarnings,
  force,
  onForceChange,
  forceLabel,
  /** Rendered below blockers/warnings — typically a list of affected rows. */
  children,
}: {
  blockers?: ReadonlyArray<PreflightItem>
  warnings?: ReadonlyArray<PreflightItem>
  softWarnings?: ReadonlyArray<ActionWarning>
  force?: boolean
  onForceChange?: (force: boolean) => void
  forceLabel?: string
  children?: React.ReactNode
}) {
  const hasBlockers   = (blockers?.length ?? 0) > 0
  const hasWarnings   = (warnings?.length ?? 0) > 0
  const hasSoft       = (softWarnings?.length ?? 0) > 0
  const hasChildren   = React.Children.count(children) > 0

  if (!hasBlockers && !hasWarnings && !hasSoft && !hasChildren) return null

  return (
    <div className="space-y-3">
      {hasBlockers && (
        <div className="rounded border border-destructive/50 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive mb-1">Cannot proceed</p>
          <ul className="list-disc pl-5 space-y-1 text-destructive">
            {blockers!.map((b, i) => <li key={i}>{b.message}</li>)}
          </ul>
        </div>
      )}
      {hasWarnings && (
        <div className="rounded border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Heads up</p>
          <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-400">
            {warnings!.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        </div>
      )}
      {hasSoft && force !== undefined && onForceChange && (
        <ActionWarnings
          warnings={[...softWarnings!]}
          force={force}
          onForceChange={onForceChange}
          forceLabel={forceLabel}
        />
      )}
      {children}
    </div>
  )
}
