import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchPetEventTypes } from '@/lib/queries/pet-event-types'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { EventTypeList } from '@/components/settings/event-type-list'
import { EventTypeFormBody } from '@/components/settings/event-type-form-body'

export const dynamic = 'force-dynamic'

export default async function PetEventTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { supabase } = await requireAuth()
  const params = await searchParams
  const editId = sanitizeUuidParam(params.edit)

  const types = await fetchPetEventTypes(supabase)

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Event types</h1>
        <p className="text-sm text-muted-foreground">
          What you log about Maple — tap a type to shape its fields.
        </p>
      </header>

      <EventTypeList
        types={types.map(({ id, name, emoji, system_key }) => ({ id, name, emoji, system_key }))}
      />

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New event type"
        editTitle="Edit event type"
        newSize="sm"
        editSize="sm"
        newBody={<EventTypeFormBody mode="new" />}
        editBody={editId ? <EventTypeFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
