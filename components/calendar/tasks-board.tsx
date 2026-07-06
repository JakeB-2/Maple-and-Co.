'use client'

// The tasks freshness board — the ≤2-tap complete path (D-007). One row per
// task: a BIG left check-off button, the emoji+title (opens the detail drawer),
// and a right-side freshness label. The row's accent fades with its freshness
// ratio via freshnessColor — greener when fresh, quietly desaturated when due,
// NEVER red (D-017). Completing a recurring task resets it to fresh (ratio ~0),
// which is the satisfying "done for now" beat.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toEpochDay } from '@/lib/recurrence'
import type { TaskBoardRow } from '@/lib/queries/task-freshness'
import { completeTask, undoTaskCompletion } from '@/lib/actions/task-completions'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { freshnessColor } from '@/components/calendar/freshness-color'
import { useUrlRowSelection } from '@/components/screens/use-url-row-selection'
import { Surface } from '@/components/screens/surface'

// Due & aging float to the top, fresh in the middle, completed one-offs sink to
// the bottom. Recurring tasks completed today read 'fresh' (freshness reset), so
// they naturally leave the top band.
function groupRank(row: TaskBoardRow): number {
  if (row.done) return 2
  if (row.stage === 'due' || row.stage === 'aging') return 0
  return 1
}

// The right-side label: "due today" / "in 3 days" / "3 days ago", or "done" for
// a completed one-off. Whole-day math through the engine's epoch-day helper.
function dueLabel(row: TaskBoardRow, today: string): string {
  if (row.done) return 'done'
  const diff = toEpochDay(row.dueOn) - toEpochDay(today)
  if (diff === 0) return 'due today'
  if (diff > 0) return `in ${diff} ${diff === 1 ? 'day' : 'days'}`
  const ago = -diff
  return `${ago} ${ago === 1 ? 'day' : 'days'} ago`
}

export function TasksBoard({ board, today }: { board: TaskBoardRow[]; today: string }) {
  const { selectRow } = useUrlRowSelection()
  const { refreshNow } = useMutationRefresh()
  const [, startTransition] = useTransition()
  // The single in-flight completion — its row shows the optimistic checked fill
  // and disables while the RPC round-trips.
  const [pendingId, setPendingId] = useState<string | null>(null)

  function onComplete(row: TaskBoardRow) {
    const { task } = row
    setPendingId(task.id)
    startTransition(async () => {
      const result = await completeTask({ task_id: task.id })
      setPendingId(null)
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      refreshNow()
      // completeTask returns the completion id — undo retracts it (and the
      // linked pet event) atomically via undoTaskCompletion.
      const completionId = result.data.id
      toast.success(`${task.emoji} ${task.title} — done`, {
        duration: 15000,
        action: {
          label: 'Undo',
          onClick: async () => {
            const undo = await undoTaskCompletion(completionId)
            if (undo.error) {
              toast.error(`Could not undo: ${undo.error}`)
              return
            }
            refreshNow()
          },
        },
      })
    })
  }

  const rows = [...board].sort((a, b) => {
    const g = groupRank(a) - groupRank(b)
    if (g !== 0) return g
    if (a.dueOn !== b.dueOn) return a.dueOn < b.dueOn ? -1 : 1
    return a.task.title.localeCompare(b.task.title)
  })

  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 ? (
        <Surface className="overflow-hidden">
          <ul className="hairline-rows">
            {rows.map((row) => {
              const { task } = row
              const accent = freshnessColor(row.ratio)
              const busy = pendingId === task.id
              // Filled check = a completed one-off, a recurring task done today,
              // or the optimistic beat while its completion is in flight.
              const checked = row.done || row.completedToday || busy
              return (
                <li key={task.id} className="flex items-stretch gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => onComplete(row)}
                    disabled={busy}
                    aria-label={`Mark ${task.title} done`}
                    className={cn(
                      'grid min-h-14 w-14 touch:min-h-16 touch:w-16 shrink-0 place-items-center self-center rounded-xl border-2 transition-colors disabled:opacity-60',
                      checked ? 'text-white' : 'hover:bg-surface-2'
                    )}
                    style={
                      checked
                        ? { backgroundColor: accent, borderColor: accent }
                        : { borderColor: accent, color: accent }
                    }
                  >
                    <Check className={cn('size-6', !checked && 'opacity-40')} aria-hidden />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectRow(task.id)}
                    className="flex min-h-14 touch:min-h-16 flex-1 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span aria-hidden className="text-xl">
                      {task.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm font-medium',
                          row.done && 'text-muted-foreground line-through'
                        )}
                      >
                        {task.title}
                      </span>
                      {task.note && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {task.note}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {dueLabel(row, today)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Surface>
      ) : (
        <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
          No tasks yet — add the household’s recurring rhythms. 🌿
        </Surface>
      )}
    </div>
  )
}
