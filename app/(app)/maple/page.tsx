import { formatDistanceToNowStrict } from 'date-fns'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchPrimaryPet } from '@/lib/queries/pets'
import { fetchAllAttributes, fetchPetEventTypes, typeConfig } from '@/lib/queries/pet-event-types'
import {
  fetchLatestEventPerType,
  fetchPetEvent,
  fetchPetEvents,
  fetchWeightSeries,
} from '@/lib/queries/pet-events'
import { recencyState } from '@/lib/queries/pet-recency'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { fetchTasks, fetchLatestCompletions } from '@/lib/queries/tasks'
import { computeMedsCountdown } from '@/lib/queries/task-freshness'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { Surface } from '@/components/screens/surface'
import { PetProfile } from '@/components/maple/pet-profile'
import { QuickLog } from '@/components/maple/quick-log'
import { EventFeed } from '@/components/maple/event-feed'
import { EventDetailDrawer } from '@/components/maple/event-detail-drawer'
import { EventLogFormBody } from '@/components/maple/event-log-form-body'
import { PetFormBody } from '@/components/maple/pet-form-body'

export const dynamic = 'force-dynamic'

export default async function MaplePage({
  searchParams,
}: {
  searchParams: Promise<{ new_log?: string; selected?: string; edit?: string; edit_pet?: string }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  const logTypeId = sanitizeUuidParam(params.new_log)
  const selectedId = sanitizeUuidParam(params.selected)
  const editId = sanitizeUuidParam(params.edit)
  const editPetId = sanitizeUuidParam(params.edit_pet)

  const pet = await fetchPrimaryPet(supabase)
  if (!pet) {
    return (
      <div className="flex flex-col gap-6">
        <header className="pt-2">
          <h1 className="text-2xl font-bold tracking-tight">Maple</h1>
          <p className="text-sm text-muted-foreground">Walks, meals, meds, weight — who did what, when.</p>
        </header>
        <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
          No pet yet — seed Maple first.
        </Surface>
      </div>
    )
  }

  const [types, attributes, events, latest, weightSeries, profiles, selected, tasks, latestCompletions] =
    await Promise.all([
      fetchPetEventTypes(supabase),
      fetchAllAttributes(supabase),
      fetchPetEvents(supabase, pet.id),
      fetchLatestEventPerType(supabase, pet.id),
      fetchWeightSeries(supabase, pet.id),
      fetchProfiles(supabase),
      selectedId ? fetchPetEvent(supabase, selectedId) : null,
      fetchTasks(supabase),
      fetchLatestCompletions(supabase),
    ])

  // Detail extras hang off the selected event — a second round-trip.
  const [comments, reactions] = selectedId
    ? await Promise.all([
        fetchComments(supabase, 'pet_event', selectedId),
        fetchReactions(supabase, 'pet_event', selectedId),
      ])
    : [[], []]

  const now = new Date()
  const chips = types.flatMap((type) => {
    const config = typeConfig(type)
    if (!config.show_on_today) return []
    const last = latest.get(type.id) ?? null
    return [
      {
        typeId: type.id,
        emoji: type.emoji,
        name: type.name,
        timeAgo: last ? formatDistanceToNowStrict(new Date(last), { addSuffix: true }) : null,
        state: recencyState(last, config, now),
      },
    ]
  })

  // Anchor on the system_key, not the type's (renameable) name.
  const medsTypeId = types.find((type) => type.system_key === 'meds')?.id ?? null
  const lastMeds = medsTypeId ? (latest.get(medsTypeId) ?? null) : null
  // D-026: the next-dose countdown projects off the linked task's freshness.
  const medsCountdown = computeMedsCountdown(
    tasks,
    latestCompletions,
    medsTypeId,
    todayInTimeZone(HOUSEHOLD_TZ)
  )

  const attributesById = Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute]))
  const profileChips = profiles.map(({ id, display_name, signature_color }) => ({
    id,
    display_name,
    signature_color,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PetProfile
        pet={pet}
        chips={chips}
        weightSeries={weightSeries}
        lastMeds={lastMeds}
        medsCountdown={medsCountdown}
      />

      <QuickLog types={types} />

      <EventFeed
        events={events}
        attributesById={attributesById}
        profiles={profileChips}
        selectedId={selectedId}
        petName={pet.name}
      />

      {selected && (
        <EventDetailDrawer
          event={selected}
          attributesById={attributesById}
          comments={comments}
          reactions={reactions}
          profiles={profileChips}
          currentUserId={user.id}
        />
      )}

      <ResourceFormDrawers
        isNew={!!logTypeId}
        newParam="new_log"
        newValue={logTypeId ?? '1'}
        newTitle="Log it"
        newSize="sm"
        newBody={logTypeId ? <EventLogFormBody mode="new" typeId={logTypeId} petId={pet.id} /> : null}
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
        editId={editPetId}
        editParam="edit_pet"
        editTitle="Edit Maple"
        editSize="sm"
        editBody={editPetId ? <PetFormBody mode="edit" id={editPetId} /> : null}
        newTitle=""
        newBody={null}
      />
    </div>
  )
}
