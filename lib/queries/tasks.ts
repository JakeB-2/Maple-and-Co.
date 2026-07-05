// Read-side for tasks. Rows carry the six embedded recur_* columns so fromDb(row)
// reconstructs the rule directly (see lib/recurrence). Freshness projection lives
// in task-freshness.ts; this layer fetches live rows and the latest completion per
// task, reduced to a household-TZ date for the board.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { RecurUnit, RecurSemantics } from '@/lib/recurrence/types'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'

export const TASK_SELECT = `
  id, title, note, emoji, anchor_on,
  recur_unit, recur_interval, recur_weekdays, recur_month_day, recur_semantics, recur_until,
  pet_id, log_pet_event_type_id,
  created_at, created_by_user_id
` as const

export type TaskRow = {
  id: string
  title: string
  note: string | null
  emoji: string
  anchor_on: string
  // Narrowed to the engine's unions (the DB CHECK guarantees membership) so
  // fromDb(row) reconstructs the rule without a cast. Tasks allow both semantics.
  recur_unit: RecurUnit | null
  recur_interval: number | null
  recur_weekdays: number[] | null
  recur_month_day: number | null
  recur_semantics: RecurSemantics | null
  recur_until: string | null
  pet_id: string | null
  log_pet_event_type_id: string | null
  created_at: string
  created_by_user_id: string | null
}

// The latest LIVE completion for each task, already reduced to household-TZ date.
export type LatestCompletion = {
  taskId: string
  completionId: string
  completedAt: string // raw ISO timestamptz
  completedOn: string // 'YYYY-MM-DD' in HOUSEHOLD_TZ
}

export async function fetchTasks(supabase: SupabaseClient<Database>): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .is('deleted_at', null)
    .order('anchor_on')

  if (error) throw error
  return (data ?? []) as unknown as TaskRow[]
}

export async function fetchTask(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as unknown as TaskRow | null
}

// Newest-first over all live completions, then keep the FIRST row seen per task
// (= the newest, since ordered desc). completedOn folds the timestamptz into the
// household calendar day so "done today" comparisons stay in one timezone.
export async function fetchLatestCompletions(
  supabase: SupabaseClient<Database>
): Promise<Map<string, LatestCompletion>> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('id, task_id, completed_at')
    .is('deleted_at', null)
    .order('completed_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as {
    id: string
    task_id: string
    completed_at: string
  }[]

  const latest = new Map<string, LatestCompletion>()
  for (const row of rows) {
    if (latest.has(row.task_id)) continue
    latest.set(row.task_id, {
      taskId: row.task_id,
      completionId: row.id,
      completedAt: row.completed_at,
      completedOn: todayInTimeZone(HOUSEHOLD_TZ, new Date(row.completed_at)),
    })
  }
  return latest
}

// Full LIVE completion history for one task (task detail drawer).
export type CompletionRow = {
  id: string
  completed_at: string
  completed_by_user_id: string
  note: string | null
}

export async function fetchTaskCompletions(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<CompletionRow[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('id, completed_at, completed_by_user_id, note')
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as CompletionRow[]
}
