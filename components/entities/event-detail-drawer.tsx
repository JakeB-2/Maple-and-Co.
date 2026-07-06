'use client'

import Link from 'next/link'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import type { EventTypeAttributeRow } from '@/lib/queries/event-types'
import type { EntityEventRow } from '@/lib/queries/entity-events'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { DetailDrawer, DetailDrawerFooter } from '@/components/screens/detail-drawer'
import {
  ReactionsRow,
  CommentsSection,
  type ProfileChip,
} from '@/components/screens/entity-social'
import { Field } from '@/components/screens/field'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'
import { EventValueLines } from '@/components/entities/event-values'

export function EventDetailDrawer({
  event,
  attributesById,
  comments,
  reactions,
  profiles,
  currentUserId,
  basePath,
}: {
  event: EntityEventRow
  attributesById: Record<string, EventTypeAttributeRow>
  comments: CommentRow[]
  reactions: ReactionRow[]
  profiles: ProfileChip[]
  currentUserId: string
  /** The owning entity's profile route (`/pets/<id>` | `/plants/<id>`). */
  basePath: string
}) {
  const layer = useDrawerNavHref()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const { replaceAndRefresh } = useMutationRefresh()
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const doneBy = profilesById.get(event.done_by_user_id)

  async function onDelete() {
    const deleted = await runDelete({
      table: 'entity_events',
      id: event.id,
      noun: 'Log',
      label: event.event_type.name,
    })
    if (!deleted) return
    // The row is gone; drop ?selected= so the empty drawer doesn't linger.
    replaceAndRefresh(layer(basePath))
  }

  return (
    <DetailDrawer
      paramKey="selected"
      paramValue={event.id}
      size="sm"
      header={{
        eyebrow: event.event_type.name,
        title: `${event.event_type.emoji} ${event.event_type.name}`,
        subtitle: `${formatDistanceToNowStrict(new Date(event.occurred_at), { addSuffix: true })} · ${doneBy?.display_name ?? 'Someone'}`,
        extraActions: (
          <Button asChild variant="ghost" size="icon" aria-label="Edit log">
            <Link href={layer(`${basePath}?selected=${event.id}&edit=${event.id}`)}>
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
              disabled={deletingId === event.id}
              onClick={onDelete}
            >
              <Trash2 /> Delete log
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <EventValueLines event={event} attributesById={attributesById} />
          <Field label="When">{format(new Date(event.occurred_at), 'PPp')}</Field>
          <Field label="By">
            <AvatarChip
              name={doneBy?.display_name ?? '?'}
              color={doneBy?.signature_color ?? '#8b8b8b'}
              size="sm"
              withName
            />
          </Field>
          {event.note && (
            <Field label="Note" alignTop>
              <span className="whitespace-pre-wrap break-words">{event.note}</span>
            </Field>
          )}
        </div>

        <ReactionsRow
          entityType="entity_event"
          entityId={event.id}
          reactions={reactions}
          currentUserId={currentUserId}
        />
        <CommentsSection
          entityType="entity_event"
          entityId={event.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
