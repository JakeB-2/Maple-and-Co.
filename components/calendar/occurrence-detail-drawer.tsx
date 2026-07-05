'use client'

// Detail drawer for a single occurrence of a calendar event. Opened by the
// ?selected=<id>:<date> grammar; the event id drives the shared social entity
// ('calendar_event'), the date scopes the "just this one" exclusion. Two
// deletes: skip this single occurrence (adds an exclusion — recurring only) or
// soft-delete the whole event. Mirrors spend-detail-drawer's wiring.

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CalendarX, Pencil, Trash2 } from 'lucide-react'
import { parseDateOnlyLocal } from '@/lib/format-date'
import { fromDb } from '@/lib/recurrence'
import type { CalendarEventRow } from '@/lib/queries/calendar-events'
import type { CommentRow, ReactionRow } from '@/lib/queries/comments'
import { addEventExclusion } from '@/lib/actions/calendar-events'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { describeRecurrence } from '@/components/calendar/recurrence-editor'
import { formatEventTime } from '@/components/calendar/calendar-view'
import { DetailDrawer, DetailDrawerFooter } from '@/components/screens/detail-drawer'
import {
  ReactionsRow,
  CommentsSection,
  type ProfileChip,
} from '@/components/screens/entity-social'
import { Field } from '@/components/screens/field'
import { Button } from '@/components/ui/button'

export function OccurrenceDetailDrawer({
  event,
  date,
  comments,
  reactions,
  profiles,
  currentUserId,
}: {
  event: CalendarEventRow
  date: string
  comments: CommentRow[]
  reactions: ReactionRow[]
  profiles: ProfileChip[]
  currentUserId: string
}) {
  const layer = useDrawerNavHref()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const { replaceAndRefresh } = useMutationRefresh()
  const [excluding, setExcluding] = useState(false)
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

  const key = `${event.id}:${date}`
  const rule = fromDb(event)
  const recurring = rule !== null
  const dateLabel = format(parseDateOnlyLocal(date) ?? new Date(), 'EEEE d MMM yyyy')
  const timeLabel = formatEventTime(event)

  // Drop just this date from the series. The action is idempotent, so a double
  // tap is harmless; on success the ?selected= occurrence is gone, so close.
  async function onDeleteOccurrence() {
    setExcluding(true)
    const result = await addEventExclusion(event.id, date)
    setExcluding(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    replaceAndRefresh(layer('/calendar'))
  }

  async function onDeleteEvent() {
    const deleted = await runDelete({
      table: 'calendar_events',
      id: event.id,
      noun: 'Event',
      label: event.title,
    })
    if (!deleted) return
    // The event is gone; drop ?selected= so the empty drawer doesn't linger.
    replaceAndRefresh(layer('/calendar'))
  }

  return (
    <DetailDrawer
      paramKey="selected"
      paramValue={key}
      size="sm"
      header={{
        eyebrow: recurring ? describeRecurrence(rule, event.starts_on) : 'Event',
        title: event.title,
        subtitle: `${dateLabel} · ${timeLabel}`,
        extraActions: (
          <Button asChild variant="ghost" size="icon" aria-label="Edit event">
            <Link href={layer(`/calendar?selected=${key}&edit=${event.id}`)}>
              <Pencil />
            </Link>
          </Button>
        ),
      }}
      footer={
        <DetailDrawerFooter
          destructive={
            recurring ? (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={excluding}
                onClick={onDeleteOccurrence}
              >
                <CalendarX /> Delete just this one
              </Button>
            ) : undefined
          }
        >
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={deletingId === event.id}
            onClick={onDeleteEvent}
          >
            <Trash2 /> Delete event
          </Button>
        </DetailDrawerFooter>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Field label="When">
            {dateLabel} · {timeLabel}
          </Field>
          {event.location && <Field label="Where">{event.location}</Field>}
          <Field label="Repeats">{describeRecurrence(rule, event.starts_on)}</Field>
          {event.note && (
            <Field label="Note" alignTop>
              <span className="whitespace-pre-wrap break-words">{event.note}</span>
            </Field>
          )}
        </div>
        <ReactionsRow
          entityType="calendar_event"
          entityId={event.id}
          reactions={reactions}
          currentUserId={currentUserId}
        />
        <CommentsSection
          entityType="calendar_event"
          entityId={event.id}
          comments={comments}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      </div>
    </DetailDrawer>
  )
}
