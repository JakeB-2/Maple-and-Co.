// Shared entity profile body (D-032/D-033): pets and plants render the exact
// same page — profile card, needs recency chips, quick-log picker, needs
// management list, event feed, and the drawer stack. The two [entityId] route
// files are thin wrappers.

import { formatDistanceToNowStrict } from 'date-fns'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchEntity, type EntityKind } from '@/lib/queries/entities'
import { fetchAllAttributes, fetchEventTypes } from '@/lib/queries/event-types'
import {
  fetchEntityEvent,
  fetchEntityEvents,
  fetchLatestEventPerType,
  fetchWeightSeries,
} from '@/lib/queries/entity-events'
import { fetchNeedsForEntity } from '@/lib/queries/needs'
import { recencyState } from '@/lib/queries/need-recency'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { fetchTasks, fetchLatestCompletions } from '@/lib/queries/tasks'
import { computeNeedCountdown } from '@/lib/queries/task-freshness'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import {
  EntityProfile,
  type NeedChip,
  type NeedCountdownLine,
} from '@/components/entities/entity-profile'
import { QuickLog } from '@/components/entities/quick-log'
import { NeedsList } from '@/components/entities/needs-list'
import { EventFeed } from '@/components/entities/event-feed'
import { EventDetailDrawer } from '@/components/entities/event-detail-drawer'
import { EventLogFormBody } from '@/components/entities/event-log-form-body'
import { EntityFormBody } from '@/components/entities/entity-form-body'
import { NeedFormBody } from '@/components/entities/need-form-body'
import { KIND_COPY, entityPath } from '@/components/entities/entity-kind'

export type EntityProfileParams = Promise<{ entityId: string }>
export type EntityProfileSearchParams = Promise<{
  new_log?: string
  selected?: string
  edit?: string
  edit_entity?: string
  new?: string
  edit_need?: string
  capture?: string
}>

export async function EntityProfilePage({
  kind,
  params,
  searchParams,
}: {
  kind: EntityKind
  params: EntityProfileParams
  searchParams: EntityProfileSearchParams
}) {
  const { user, supabase } = await requireAuth()
  const { entityId: rawEntityId } = await params
  const search = await searchParams

  const entityId = sanitizeUuidParam(rawEntityId)
  if (!entityId) notFound()

  const logTypeId = sanitizeUuidParam(search.new_log)
  const selectedId = sanitizeUuidParam(search.selected)
  const editId = sanitizeUuidParam(search.edit)
  const editEntityId = sanitizeUuidParam(search.edit_entity)
  const editNeedId = sanitizeUuidParam(search.edit_need)

  const entity = await fetchEntity(supabase, entityId)
  // Wrong id OR a live entity of the other kind pasted under this module's
  // route — both are a 404, not a soft empty state.
  if (!entity || entity.kind !== kind) notFound()

  const basePath = entityPath(kind, entity.id)

  const [types, attributes, events, latest, weightSeries, needs, profiles, selected, tasks, latestCompletions] =
    await Promise.all([
      fetchEventTypes(supabase, kind),
      fetchAllAttributes(supabase),
      fetchEntityEvents(supabase, entity.id),
      fetchLatestEventPerType(supabase, entity.id),
      fetchWeightSeries(supabase, entity.id),
      fetchNeedsForEntity(supabase, entity.id),
      fetchProfiles(supabase),
      selectedId ? fetchEntityEvent(supabase, selectedId) : null,
      fetchTasks(supabase),
      fetchLatestCompletions(supabase),
    ])

  // Detail extras hang off the selected event — a second round-trip.
  const [comments, reactions] = selectedId
    ? await Promise.all([
        fetchComments(supabase, 'entity_event', selectedId),
        fetchReactions(supabase, 'entity_event', selectedId),
      ])
    : [[], []]

  const now = new Date()
  const today = todayInTimeZone(HOUSEHOLD_TZ)

  // One recency chip per need (D-032): last-fulfilled derives from the latest
  // live event of the need's type — never stored on the need itself.
  const chips: NeedChip[] = needs.map((need) => {
    const last = latest.get(need.event_type_id) ?? null
    return {
      needId: need.id,
      emoji: need.event_type.emoji,
      name: need.event_type.name,
      timeAgo: last ? formatDistanceToNowStrict(new Date(last), { addSuffix: true }) : null,
      state: recencyState(last, need, now),
    }
  })

  // D-026 generalized by D-032: a need whose schedule lives on a linked live
  // task projects a whole-day countdown off that task's freshness.
  const countdowns: NeedCountdownLine[] = needs.flatMap((need) => {
    const countdown = computeNeedCountdown(tasks, latestCompletions, need.id, today)
    if (!countdown) return []
    return [
      {
        needId: need.id,
        emoji: need.event_type.emoji,
        name: need.event_type.name,
        dueOn: countdown.dueOn,
      },
    ]
  })

  const attributesById = Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute]))
  // Types with any required attribute open the full form; the rest auto-log on
  // tile tap (QuickLog / R5). Derived here since the page already has every
  // attribute in hand.
  const requiredTypeIds = [
    ...new Set(attributes.filter((attribute) => attribute.required).map((attribute) => attribute.event_type_id)),
  ]
  const profileChips = profiles.map(({ id, display_name, signature_color }) => ({
    id,
    display_name,
    signature_color,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={entity.name}
        backHref={KIND_COPY[kind].base}
        backLabel={KIND_COPY[kind].label}
      />

      <EntityProfile entity={entity} chips={chips} weightSeries={weightSeries} countdowns={countdowns} />

      <QuickLog
        types={types}
        requiredTypeIds={requiredTypeIds}
        entityId={entity.id}
        kind={kind}
        currentUserId={user.id}
        captureParam={search.capture === '1' ? '1' : null}
      />

      <section className="flex flex-col gap-1.5">
        <h2 className="px-1 text-eyebrow text-muted-foreground">Needs</h2>
        <NeedsList
          needs={needs}
          basePath={basePath}
          // Raw need_id (not the live-filtered embed): any live task's linkage
          // blocks deleting the need it points at.
          linkedNeedIds={tasks.flatMap((task) => (task.need_id ? [task.need_id] : []))}
        />
      </section>

      <EventFeed
        events={events}
        attributesById={attributesById}
        profiles={profileChips}
        selectedId={selectedId}
        entityName={entity.name}
        kind={kind}
      />

      {selected && (
        <EventDetailDrawer
          event={selected}
          attributesById={attributesById}
          comments={comments}
          reactions={reactions}
          profiles={profileChips}
          currentUserId={user.id}
          basePath={basePath}
        />
      )}

      <ResourceFormDrawers
        isNew={!!logTypeId}
        newParam="new_log"
        newValue={logTypeId ?? '1'}
        newTitle="Log it"
        newSize="sm"
        newBody={
          logTypeId ? (
            <EventLogFormBody mode="new" typeId={logTypeId} entityId={entity.id} kind={kind} />
          ) : null
        }
        editId={null}
        editTitle=""
        editBody={null}
      />

      <ResourceFormDrawers
        isNew={false}
        editId={editId}
        editTitle="Edit log"
        editSize="sm"
        editBody={editId ? <EventLogFormBody mode="edit" id={editId} /> : null}
        newTitle=""
        newBody={null}
      />

      <ResourceFormDrawers
        isNew={false}
        editId={editEntityId}
        editParam="edit_entity"
        editTitle={`Edit ${entity.name}`}
        editSize="sm"
        editBody={
          editEntityId ? <EntityFormBody mode="edit" kind={kind} id={editEntityId} /> : null
        }
        newTitle=""
        newBody={null}
      />

      <ResourceFormDrawers
        isNew={search.new === '1'}
        editId={editNeedId}
        editParam="edit_need"
        newTitle="New need"
        editTitle="Edit need"
        newSize="sm"
        editSize="sm"
        newBody={<NeedFormBody mode="new" entityId={entity.id} kind={kind} />}
        editBody={
          editNeedId ? (
            <NeedFormBody mode="edit" entityId={entity.id} kind={kind} id={editNeedId} />
          ) : null
        }
      />
    </div>
  )
}
