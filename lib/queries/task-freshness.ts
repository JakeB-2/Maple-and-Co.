// Pure freshness projection for the tasks board and the per-need countdown
// (D-026's meds pattern, generalized to any need by D-032; D-017: staleness
// fades, never shames — no red/overdue stage). No Supabase: every projection
// runs through the recurrence engine's freshness(). tasks.ts fetches the live
// rows and the latest completion per task; this layer turns them into dated,
// staged board rows.

import type { TaskRow } from './tasks'
import type { LatestCompletion } from './tasks'
import { addDays, freshness, fromDb, nextOccurrence, type FreshnessStage } from '@/lib/recurrence'

export type TaskBoardRow = {
  task: TaskRow
  isRecurring: boolean
  lastDone: string | null // household-TZ date of latest live completion, or null
  completedToday: boolean // lastDone === today
  done: boolean // a COMPLETED one-off (recurring tasks are never 'done')
  stage: FreshnessStage // 'fresh' | 'aging' | 'due'
  ratio: number // 0..1.5 — drives the saturation fade (never red, D-017)
  dueOn: string // next due date 'YYYY-MM-DD'
}

/**
 * Board rows for every task, freshness computed against `today` ('YYYY-MM-DD').
 * - Recurring task: freshness({anchor: task.anchor_on, interval, unit, lastDone,
 *   today}) drives dueOn/stage/ratio; a recurring task is never 'done'.
 * - One-off task (recurrence null): dueOn = anchor_on; done once a completion
 *   exists; stage/ratio flip at the anchor (today >= anchor_on).
 */
export function buildTaskBoard(
  tasks: TaskRow[],
  latestByTask: Map<string, LatestCompletion>,
  today: string
): TaskBoardRow[] {
  return tasks.map((task) => {
    const lastDone = latestByTask.get(task.id)?.completedOn ?? null
    const projection = projectTask(task, lastDone, today)
    return {
      task,
      isRecurring: projection.isRecurring,
      lastDone,
      completedToday: lastDone === today,
      done: projection.done,
      stage: projection.stage,
      ratio: projection.ratio,
      dueOn: projection.dueOn,
    }
  })
}

export type NeedCountdown = {
  taskId: string
  lastDone: string | null
  dueOn: string
  stage: FreshnessStage
} | null

/**
 * D-026 (per-need since D-032): a need's countdown = freshness projection of
 * the LIVE task whose need_id === needId (first match). null when needId is
 * null or no task links to the need.
 */
export function computeNeedCountdown(
  tasks: TaskRow[],
  latestByTask: Map<string, LatestCompletion>,
  needId: string | null,
  today: string
): NeedCountdown {
  if (needId === null) return null

  const task = tasks.find((t) => t.need_id === needId)
  if (task === undefined) return null

  const lastDone = latestByTask.get(task.id)?.completedOn ?? null
  const projection = projectTask(task, lastDone, today)
  return { taskId: task.id, lastDone, dueOn: projection.dueOn, stage: projection.stage }
}

type TaskProjection = {
  isRecurring: boolean
  done: boolean
  stage: FreshnessStage
  ratio: number
  dueOn: string
}

// Shared per-task projection behind the board and the countdown. Recurring tasks
// defer entirely to freshness(); a one-off has a single fixed due date at its
// anchor and becomes 'done' the moment any completion exists.
function projectTask(task: TaskRow, lastDone: string | null, today: string): TaskProjection {
  // The row type narrows unit/semantics to the engine unions, so the six recur_*
  // columns ARE a RecurrenceDbColumns — fromDb takes the row directly.
  const rule = fromDb(task)

  if (rule === null) {
    const due = today >= task.anchor_on
    const done = lastDone !== null
    return {
      isRecurring: false,
      done,
      stage: due ? 'due' : 'fresh',
      ratio: done ? 0 : due ? 1 : 0,
      dueOn: task.anchor_on,
    }
  }

  const f = freshness({
    anchor: task.anchor_on,
    interval: rule.interval,
    unit: rule.unit,
    lastDone,
    today,
  })

  // The fade (ratio/stage) is always recency-of-doing. The DUE DATE, though,
  // depends on the semantics (D-015): after_done chases the last completion —
  // freshness's lastDone+interval is exactly that — while `fixed` follows its own
  // grid, independent of when the chore was actually done. So a fixed "trash
  // every Tue" stays on Tuesdays even after a late completion, rather than
  // drifting to lastDone+interval. Its weekday/day-of-month picks matter here.
  let dueOn = f.dueOn
  if (rule.semantics === 'fixed') {
    // The next grid occurrence strictly after the last completion (or, if never
    // done, the first occurrence on/after the anchor).
    const from = lastDone ?? addDays(task.anchor_on, -1)
    dueOn = nextOccurrence(rule, task.anchor_on, from) ?? f.dueOn
  }
  return { isRecurring: true, done: false, stage: f.stage, ratio: f.ratio, dueOn }
}
