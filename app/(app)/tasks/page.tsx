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
import { fetchAllNeeds } from '@/lib/queries/needs'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { PageHeader } from '@/components/shell/page-header'
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

  // Needs feed the task form's need picker (D-032) — fetched here so both the
  // new and edit drawer bodies share one round-trip.
  const [tasks, latest, profiles, needs, selected] = await Promise.all([
    fetchTasks(supabase),
    fetchLatestCompletions(supabase),
    fetchProfiles(supabase),
    fetchAllNeeds(supabase),
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
      {/* Independent surface (D-030, D-033): no Calendar coupling — this page
          arrives via More Actions; Today keeps its own digest board. */}
      <PageHeader title="Tasks" subtitle="The household rhythm — freshest first, nothing nags." />

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
        newBody={<TaskFormBody mode="new" needs={needs} />}
        editBody={editId ? <TaskFormBody mode="edit" id={editId} needs={needs} /> : null}
      />
    </div>
  )
}
