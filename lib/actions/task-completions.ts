'use server'

// Completing/undoing a task goes through atomic RPCs: a completion on a
// need-linked task also writes the mirrored entity_event (D-032; linked back via
// task_completions.logged_event_id), so both commit or fail as one.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, sanitizeActionError, type ActionResult } from '@/lib/action-result'
import { revalidateTable } from '@/lib/cache/table-revalidation'
import { completeTaskInputSchema } from '@/lib/schemas/task-completion'

export async function completeTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await requireAuth()

  const parsed = completeTaskInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { data, error } = await supabase.rpc('fn_complete_task', {
    p_task_id: parsed.data.task_id,
    // A completion timestamp (timestamptz), not a date column — ISO is correct.
    p_completed_at: new Date().toISOString(),
    p_completed_by_user_id: user.id,
    // Nullable in SQL; typegen types args as required.
    p_note: parsed.data.note as string,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  if (!data) return fail('That task is gone.')

  revalidateTable('task_completions')
  revalidateTable('entity_events')
  return ok({ id: data })
}

export async function undoTaskCompletion(completionId: string): Promise<ActionResult<null>> {
  const { user, supabase } = await requireAuth()

  const { data, error } = await supabase.rpc('fn_undo_task_completion', {
    p_completion_id: completionId,
    p_user_id: user.id,
  })

  if (error) return fail(sanitizeActionError(error))
  if (!data) return fail('That was already undone.')

  revalidateTable('task_completions')
  revalidateTable('entity_events')
  return ok(null)
}
