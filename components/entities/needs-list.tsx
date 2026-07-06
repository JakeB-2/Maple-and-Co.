'use client'

// Needs management on the entity profile (D-032): each row pairs an event
// type with this entity's cadence. Reuses SortableSettingsList — reorder rides
// moveSortable('needs', …) which scopes ordering per entity, delete rides the
// generic soft-delete + undo toast. The list's "New need" button opens ?new=1
// (its built-in grammar); edit opens ?edit_need=<id> so it can't collide with
// the profile's ?edit=<eventId> log editing.

import { SortableSettingsList } from '@/components/settings/sortable-settings-list'
import type { NeedWithType } from '@/lib/queries/needs'

// 'every 12h', with friendlier words at the common day marks. NULL cadence =
// track-last-done-only (the Meds pattern, D-026) — its schedule, if any, lives
// on a linked task.
export function cadenceSummary(expectEveryHours: number | null): string {
  if (expectEveryHours === null) return 'no schedule'
  if (expectEveryHours === 24) return 'daily'
  if (expectEveryHours === 168) return 'weekly'
  if (expectEveryHours % 24 === 0) return `every ${expectEveryHours / 24} days`
  return `every ${expectEveryHours}h`
}

export function NeedsList({
  needs,
  basePath,
  linkedNeedIds,
}: {
  needs: NeedWithType[]
  basePath: string
  /** Needs referenced by live tasks — deleting one would silently stop the
   *  task's auto-log (fn_complete_task only honors live needs), so block it. */
  linkedNeedIds: string[]
}) {
  const linked = new Set(linkedNeedIds)
  return (
    <SortableSettingsList
      items={needs}
      table="needs"
      editHref={(need) => `${basePath}?edit_need=${need.id}`}
      rowLabel={(need) => need.event_type.name}
      deleteNoun="Need"
      canDelete={(need) => !linked.has(need.id)}
      deleteDisabledReason="A task fulfills this need — unlink or delete the task first."
      newLabel="New need"
      emptyText="No needs yet — add one to start tracking cadence."
      renderLead={(need) => (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span aria-hidden className="text-base">
            {need.event_type.emoji}
          </span>
          <span className="min-w-0 truncate text-sm">{need.event_type.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {cadenceSummary(need.expect_every_hours)}
          </span>
          {need.show_on_today && (
            <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
              Today
            </span>
          )}
        </div>
      )}
    />
  )
}
