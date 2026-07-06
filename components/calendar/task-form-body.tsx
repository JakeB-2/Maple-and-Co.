// Async server body for the task create/edit drawer — the page hands in the
// live needs (one fetch shared by both drawer bodies); this only fetches the
// row for edit inside the drawer's Suspense boundary, then hands plain props
// to the client TaskForm.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchTask } from '@/lib/queries/tasks'
import type { NeedWithEntity } from '@/lib/queries/needs'
import { fromDb } from '@/lib/recurrence/types'
import { TaskForm, type TaskFormDefaults } from './task-form'

type TaskFormBodyProps = { needs: NeedWithEntity[] } & (
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
)

export async function TaskFormBody(props: TaskFormBodyProps) {
  const { supabase } = await requireAuth()
  const task = props.mode === 'edit' ? await fetchTask(supabase, props.id) : null

  // One option per live need, labelled by owner + type so 'Feed' rows for two
  // pets stay distinguishable (D-032).
  const needOptions = props.needs.map((need) => ({
    value: need.id,
    label: `${need.entity.name} · ${need.event_type.emoji} ${need.event_type.name}`,
  }))

  if (props.mode === 'edit') {
    if (!task) {
      return (
        <FormBodyNotFound noun="task" />
      )
    }
    const defaults: TaskFormDefaults = {
      title: task.title,
      emoji: task.emoji,
      anchor_on: task.anchor_on,
      note: task.note ?? '',
      recurrence: fromDb(task),
      // Seed from the live-filtered embed, not the raw column: a task whose
      // need was soft-deleted edits (and saves) as unlinked, instead of the
      // picker holding an id no option represents while locking 'About'.
      need_id: task.need?.id ?? '',
      entity_label: task.entity_label ?? '',
    }
    return <TaskForm mode="edit" id={task.id} defaultValues={defaults} needOptions={needOptions} />
  }

  // New defaults (≤2-tap budget): a friendly check emoji, first due today in
  // household time, no repeat, no need or label linkage.
  const defaults: TaskFormDefaults = {
    title: '',
    emoji: '✅',
    anchor_on: todayInTimeZone(HOUSEHOLD_TZ),
    note: '',
    recurrence: null,
    need_id: '',
    entity_label: '',
  }
  return <TaskForm mode="new" defaultValues={defaults} needOptions={needOptions} />
}
