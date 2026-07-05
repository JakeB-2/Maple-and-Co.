import { describe, expect, it } from 'vitest'
import { buildTaskBoard, computeMedsCountdown } from '@/lib/queries/task-freshness'
import type { LatestCompletion, TaskRow } from '@/lib/queries/tasks'

// The pure functions never touch Supabase, so tests just build plain rows. A
// one-off is all-null recur columns; each test overrides only what it exercises.
function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: crypto.randomUUID(),
    title: 'Task',
    note: null,
    emoji: '✅',
    anchor_on: '2026-07-01',
    recur_unit: null,
    recur_interval: null,
    recur_weekdays: null,
    recur_month_day: null,
    recur_semantics: null,
    recur_until: null,
    pet_id: null,
    log_pet_event_type_id: null,
    created_at: '2026-07-01T12:00:00Z',
    created_by_user_id: 'user-1',
    ...overrides,
  }
}

// A recurring after_done task: due `intervalDays` after the last completion (or
// the anchor). Matches how meds/chore cadences project through freshness().
function afterDoneDaily(intervalDays: number, overrides: Partial<TaskRow> = {}): TaskRow {
  return taskRow({
    recur_unit: 'day',
    recur_interval: intervalDays,
    recur_semantics: 'after_done',
    ...overrides,
  })
}

function completion(taskId: string, completedOn: string): LatestCompletion {
  return {
    taskId,
    completionId: crypto.randomUUID(),
    completedAt: `${completedOn}T12:00:00Z`,
    completedOn,
  }
}

function latest(...completions: LatestCompletion[]): Map<string, LatestCompletion> {
  return new Map(completions.map((c) => [c.taskId, c]))
}

describe('buildTaskBoard — recurring after_done freshness (D-017)', () => {
  it('is fresh at ratio 0 and reports the projected dueOn', () => {
    const task = afterDoneDaily(4) // anchor 2026-07-01, +4 days
    const [row] = buildTaskBoard([task], new Map(), '2026-07-01')
    expect(row.isRecurring).toBe(true)
    expect(row.done).toBe(false)
    expect(row.ratio).toBe(0)
    expect(row.stage).toBe('fresh')
    expect(row.dueOn).toBe('2026-07-05')
    expect(row.lastDone).toBeNull()
    expect(row.completedToday).toBe(false)
  })

  it('is aging at the 0.75 boundary', () => {
    const [row] = buildTaskBoard([afterDoneDaily(4)], new Map(), '2026-07-04') // 3 / 4
    expect(row.ratio).toBe(0.75)
    expect(row.stage).toBe('aging')
  })

  it('is due at the 1.0 boundary', () => {
    const [row] = buildTaskBoard([afterDoneDaily(4)], new Map(), '2026-07-05') // 4 / 4
    expect(row.ratio).toBe(1)
    expect(row.stage).toBe('due')
  })

  it('clamps a long-neglected recurring task at 1.5 (never past due, D-017)', () => {
    const [row] = buildTaskBoard([afterDoneDaily(4)], new Map(), '2026-07-20') // 19 / 4 → 4.75
    expect(row.ratio).toBe(1.5)
    expect(row.stage).toBe('due')
    expect(row.done).toBe(false)
  })

  it('resets to fresh when completed today (baseline moves to the completion)', () => {
    const task = afterDoneDaily(4)
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-05')), '2026-07-05')
    expect(row.completedToday).toBe(true)
    expect(row.lastDone).toBe('2026-07-05')
    expect(row.ratio).toBe(0)
    expect(row.stage).toBe('fresh')
    expect(row.dueOn).toBe('2026-07-09') // completion + 4 days, not the anchor
    expect(row.done).toBe(false)
  })

  it('re-baselines dueOn/ratio off the latest completion, not the anchor', () => {
    const task = afterDoneDaily(4)
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-03')), '2026-07-04') // 1 / 4
    expect(row.lastDone).toBe('2026-07-03')
    expect(row.dueOn).toBe('2026-07-07')
    expect(row.ratio).toBe(0.25)
    expect(row.stage).toBe('fresh')
    expect(row.completedToday).toBe(false)
  })
})

describe('buildTaskBoard — fixed recurring follows the grid, not the completion (D-015)', () => {
  it('projects a late-completed fixed monthly to the next grid day, not lastDone+interval', () => {
    // "Pay rent on the 1st" done late on the 20th: next due is the 1st, NOT the 20th+1mo.
    const task = taskRow({
      recur_unit: 'month',
      recur_interval: 1,
      recur_semantics: 'fixed',
      recur_month_day: 1,
      anchor_on: '2026-07-01',
    })
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-20')), '2026-07-21')
    expect(row.dueOn).toBe('2026-08-01') // grid, not 2026-08-20
  })

  it('points a never-done fixed monthly at its first grid occurrence', () => {
    const task = taskRow({
      recur_unit: 'month',
      recur_interval: 1,
      recur_semantics: 'fixed',
      recur_month_day: 1,
      anchor_on: '2026-07-01',
    })
    const [row] = buildTaskBoard([task], new Map(), '2026-07-10')
    expect(row.dueOn).toBe('2026-07-01')
  })

  it('keeps a fixed weekly on its weekday after a late (off-grid) completion', () => {
    // Empty weekdays = the anchor's own weekday. Done the day AFTER the anchor;
    // next grid date is anchor+7 (2026-07-14), not completion+7 (2026-07-15).
    const task = taskRow({
      recur_unit: 'week',
      recur_interval: 1,
      recur_semantics: 'fixed',
      recur_weekdays: [],
      anchor_on: '2026-07-07',
    })
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-08')), '2026-07-09')
    expect(row.dueOn).toBe('2026-07-14')
  })
})

describe('buildTaskBoard — one-off tasks', () => {
  it('is fresh before its anchor and never done without a completion', () => {
    const task = taskRow({ anchor_on: '2026-07-10' }) // one-off, in the future
    const [row] = buildTaskBoard([task], new Map(), '2026-07-05')
    expect(row.isRecurring).toBe(false)
    expect(row.stage).toBe('fresh')
    expect(row.ratio).toBe(0)
    expect(row.done).toBe(false)
    expect(row.dueOn).toBe('2026-07-10')
  })

  it('is due on and after its anchor', () => {
    const onAnchor = buildTaskBoard([taskRow({ anchor_on: '2026-07-05' })], new Map(), '2026-07-05')[0]
    expect(onAnchor.stage).toBe('due')
    expect(onAnchor.ratio).toBe(1)
    expect(onAnchor.done).toBe(false)

    const past = buildTaskBoard([taskRow({ anchor_on: '2026-07-01' })], new Map(), '2026-07-05')[0]
    expect(past.stage).toBe('due')
    expect(past.ratio).toBe(1)
  })

  it('is done with ratio 0 once a completion exists', () => {
    const task = taskRow({ anchor_on: '2026-07-01' })
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-03')), '2026-07-05')
    expect(row.done).toBe(true)
    expect(row.ratio).toBe(0)
    expect(row.lastDone).toBe('2026-07-03')
    expect(row.completedToday).toBe(false)
    expect(row.dueOn).toBe('2026-07-01')
  })

  it('flags completedToday for a one-off finished today', () => {
    const task = taskRow({ anchor_on: '2026-07-01' })
    const [row] = buildTaskBoard([task], latest(completion(task.id, '2026-07-05')), '2026-07-05')
    expect(row.completedToday).toBe(true)
    expect(row.done).toBe(true)
    expect(row.ratio).toBe(0)
  })
})

describe('buildTaskBoard — shape', () => {
  it('maps each task to exactly one row, keyed by the task', () => {
    const a = taskRow({ anchor_on: '2026-07-01' })
    const b = afterDoneDaily(4)
    const board = buildTaskBoard([a, b], new Map(), '2026-07-05')
    expect(board).toHaveLength(2)
    expect(board.map((r) => r.task.id)).toEqual([a.id, b.id])
  })

  it('returns an empty board for no tasks', () => {
    expect(buildTaskBoard([], new Map(), '2026-07-05')).toEqual([])
  })
})

describe('computeMedsCountdown (D-026)', () => {
  const MEDS = crypto.randomUUID()

  function medsTask(overrides: Partial<TaskRow> = {}): TaskRow {
    return afterDoneDaily(4, { log_pet_event_type_id: MEDS, ...overrides })
  }

  it('finds the linked task and projects dueOn off the anchor with no completion', () => {
    const task = medsTask()
    const other = taskRow({ anchor_on: '2026-07-02' })
    const got = computeMedsCountdown([other, task], new Map(), MEDS, '2026-07-01')
    expect(got).toEqual({ taskId: task.id, lastDone: null, dueOn: '2026-07-05', stage: 'fresh' })
  })

  it('projects the countdown off the latest completion', () => {
    const task = medsTask()
    const got = computeMedsCountdown(
      [task],
      latest(completion(task.id, '2026-07-03')),
      MEDS,
      '2026-07-07'
    )
    expect(got).toEqual({ taskId: task.id, lastDone: '2026-07-03', dueOn: '2026-07-07', stage: 'due' })
  })

  it('returns the FIRST matching task when several link the same type', () => {
    const first = medsTask()
    const second = medsTask()
    const got = computeMedsCountdown([first, second], new Map(), MEDS, '2026-07-01')
    expect(got?.taskId).toBe(first.id)
  })

  it('returns null when no task links the meds type', () => {
    const unrelated = taskRow({ log_pet_event_type_id: crypto.randomUUID() })
    expect(computeMedsCountdown([unrelated], new Map(), MEDS, '2026-07-01')).toBeNull()
  })

  it('returns null when medsTypeId is null', () => {
    expect(computeMedsCountdown([medsTask()], new Map(), null, '2026-07-01')).toBeNull()
  })

  it('returns null for an empty task list', () => {
    expect(computeMedsCountdown([], new Map(), MEDS, '2026-07-01')).toBeNull()
  })
})
