'use client'

// Task detail drawer — repeat rule, anchor, note, the optional Maple link, a
// completion history list, and the shared reactions/comments (entity 'task').
// Delete uses the generic soft-delete + undo toast, then drops ?selected= so the
// empty drawer doesn't linger over a deleted task.

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { formatDate, todayInTimeZone } from '@/lib/format-date'
import { fromDb } from '@/lib/recurrence'
import type { TaskRow, CompletionRow } from '@/lib/queries/tasks'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { describeRecurrence } from '@/components/calendar/recurrence-editor'
import { DetailDrawer, DetailDrawerFooter } from '@/components/screens/detail-drawer'
import {
  ReactionsRow,
  CommentsSection,
  type ProfileChip,
} from '@/components/screens/entity-social'
import { Field } from '@/components/screens/field'
import { SectionHeader } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'

export function TaskDetailDrawer({
  task,
  completions,
  comments,
  reactions,
  profiles,
  currentUserId,
}: {
  task: TaskRow
  completions: CompletionRow[]
  comments: CommentRow[]
  reactions: ReactionRow[]
  profiles: ProfileChip[]
  currentUserId: string
}) {
  const layer = useDrawerNavHref()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const { replaceAndRefresh } = useMutationRefresh()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  // The six recur_* columns on the row ARE a RecurrenceDbColumns — fromDb takes
  // it directly (null = one-off).
  const rule = fromDb(task)

  async function onDelete() {
    const deleted = await runDelete({
      table: 'tasks',
      id: task.id,
      noun: 'Task',
      label: task.title,
    })
    if (!deleted) return
    // The row is gone; drop ?selected= so the empty drawer doesn't linger.
    replaceAndRefresh(layer('/tasks'))
  }

  return (
    <DetailDrawer
      paramKey="selected"
      paramValue={task.id}
      size="sm"
      header={{
        eyebrow: task.emoji,
        title: task.title,
        subtitle: describeRecurrence(rule, task.anchor_on),
        extraActions: (
          <Button asChild variant="ghost" size="icon" aria-label="Edit task">
            <Link href={layer(`/tasks?selected=${task.id}&edit=${task.id}`)}>
              <Pencil />
            </Link>
          </Button>
        ),
      }}
      footer={
        <DetailDrawerFooter
          destructive={
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={deletingId === task.id}
              onClick={onDelete}
            >
              <Trash2 /> Delete task
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Field label="Repeats">{describeRecurrence(rule, task.anchor_on)}</Field>
          <Field label={rule ? 'Anchor' : 'First due'}>{formatDate(task.anchor_on)}</Field>
          {task.note && (
            <Field label="Note" alignTop>
              <span className="whitespace-pre-wrap break-words">{task.note}</span>
            </Field>
          )}
          {task.log_pet_event_type_id && <Field label="Maple">Logs to Maple</Field>}
        </div>

        {completions.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionHeader title="History" size="eyebrow" />
            <ul className="flex flex-col gap-1.5">
              {completions.map((completion) => {
                const who = profilesById.get(completion.completed_by_user_id)
                return (
                  <li key={completion.id} className="flex items-center gap-2 text-sm">
                    <AvatarChip
                      name={who?.display_name ?? '?'}
                      color={who?.signature_color ?? '#8b8b8b'}
                      size="sm"
                    />
                    <span className="text-muted-foreground">
                      {formatDate(todayInTimeZone(HOUSEHOLD_TZ, new Date(completion.completed_at)))}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <ReactionsRow
          entityType="task"
          entityId={task.id}
          reactions={reactions}
          currentUserId={currentUserId}
        />
        <CommentsSection
          entityType="task"
          entityId={task.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
