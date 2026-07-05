// Async server body for the task create/edit drawer — fetch the Maple event-type
// options + primary pet (and the row for edit) inside the drawer's Suspense
// boundary, then hand plain props to the client TaskForm.

import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchTask } from '@/lib/queries/tasks'
import { fetchPetEventTypes } from '@/lib/queries/pet-event-types'
import { fetchPrimaryPet } from '@/lib/queries/pets'
import { fromDb } from '@/lib/recurrence/types'
import { TaskForm, type TaskFormDefaults } from './task-form'

type TaskFormBodyProps = { mode: 'new' } | { mode: 'edit'; id: string }

export async function TaskFormBody(props: TaskFormBodyProps) {
  const { supabase } = await requireAuth()
  const [petEventTypes, primaryPet, task] = await Promise.all([
    fetchPetEventTypes(supabase),
    fetchPrimaryPet(supabase),
    props.mode === 'edit' ? fetchTask(supabase, props.id) : null,
  ])

  const petEventTypeOptions = petEventTypes.map(({ id, name, emoji }) => ({ id, name, emoji }))
  const primaryPetId = primaryPet?.id ?? null

  if (props.mode === 'edit') {
    if (!task) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          This task is gone — it may have just been deleted.
        </p>
      )
    }
    const defaults: TaskFormDefaults = {
      title: task.title,
      emoji: task.emoji,
      anchor_on: task.anchor_on,
      note: task.note ?? '',
      recurrence: fromDb(task),
      log_pet_event_type_id: task.log_pet_event_type_id ?? '',
    }
    return (
      <TaskForm
        mode="edit"
        id={task.id}
        defaultValues={defaults}
        petEventTypeOptions={petEventTypeOptions}
        primaryPetId={primaryPetId}
      />
    )
  }

  // New defaults (≤2-tap budget): a friendly check emoji, first due today in
  // household time, no repeat, no Maple linkage.
  const defaults: TaskFormDefaults = {
    title: '',
    emoji: '✅',
    anchor_on: todayInTimeZone(HOUSEHOLD_TZ),
    note: '',
    recurrence: null,
    log_pet_event_type_id: '',
  }
  return (
    <TaskForm
      mode="new"
      defaultValues={defaults}
      petEventTypeOptions={petEventTypeOptions}
      primaryPetId={primaryPetId}
    />
  )
}
