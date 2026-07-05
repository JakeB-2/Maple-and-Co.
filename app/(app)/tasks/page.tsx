import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import {
  fetchTasks,
  fetchTask,
  fetchLatestCompletions,
  fetchTaskCompletions,
} from '@/lib/queries/tasks'
import { buildTaskBoard } from '@/lib/queries/task-freshness'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { SectionTabs } from '@/components/calendar/section-tabs'
import { TasksBoard } from '@/components/calendar/tasks-board'
import { TaskDetailDrawer } from '@/components/calendar/task-detail-drawer'
import { TaskFormBody } from '@/components/calendar/task-form-body'

export const dynamic = 'force-dynamic'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; new?: string; edit?: string }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  const today = todayInTimeZone(HOUSEHOLD_TZ)
  const selectedId = sanitizeUuidParam(params.selected)
  const editId = sanitizeUuidParam(params.edit)

  const [tasks, latest, profiles, selected] = await Promise.all([
    fetchTasks(supabase),
    fetchLatestCompletions(supabase),
    fetchProfiles(supabase),
    selectedId ? fetchTask(supabase, selectedId) : null,
  ])

  const board = buildTaskBoard(tasks, latest, today)

  // Detail extras hang off the selected task — a second round-trip.
  const [completions, comments, reactions] = selectedId
    ? await Promise.all([
        fetchTaskCompletions(supabase, selectedId),
        fetchComments(supabase, 'task', selectedId),
        fetchReactions(supabase, 'task', selectedId),
      ])
    : [[], [], []]

  const profileChips = profiles.map(({ id, display_name, signature_color }) => ({
    id,
    display_name,
    signature_color,
  }))

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">The household rhythm — freshest first, nothing nags.</p>
      </header>

      <SectionTabs />

      <TasksBoard board={board} today={today} />

      {selected && (
        <TaskDetailDrawer
          task={selected}
          completions={completions}
          comments={comments}
          reactions={reactions}
          profiles={profileChips}
          currentUserId={user.id}
        />
      )}

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New task"
        editTitle="Edit task"
        newSize="sm"
        editSize="sm"
        newBody={<TaskFormBody mode="new" />}
        editBody={editId ? <TaskFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
