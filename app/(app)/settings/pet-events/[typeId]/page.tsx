import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchAttributesForType, fetchPetEventType } from '@/lib/queries/pet-event-types'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { AttributeList } from '@/components/settings/attribute-list'
import { AttributeFormBody } from '@/components/settings/attribute-form-body'

export const dynamic = 'force-dynamic'

export default async function PetEventTypeAttributesPage({
  params,
  searchParams,
}: {
  params: Promise<{ typeId: string }>
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { supabase } = await requireAuth()
  const { typeId: rawTypeId } = await params
  const search = await searchParams

  const typeId = sanitizeUuidParam(rawTypeId)
  if (!typeId) notFound()
  const editId = sanitizeUuidParam(search.edit)

  const [type, attributes] = await Promise.all([
    fetchPetEventType(supabase, typeId),
    fetchAttributesForType(supabase, typeId),
  ])
  if (!type) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <Link
          href="/settings/pet-events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Event types
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {type.emoji} {type.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Top to bottom = the log form&apos;s field order.
        </p>
      </header>

      <AttributeList
        typeId={typeId}
        attributes={attributes.map(({ id, label, value_kind, unit, required, system_key }) => ({
          id,
          label,
          value_kind,
          unit,
          required,
          system_key,
        }))}
      />

      <ResourceFormDrawers
        isNew={search.new === '1'}
        editId={editId}
        newTitle="New attribute"
        editTitle="Edit attribute"
        newSize="sm"
        editSize="sm"
        newBody={<AttributeFormBody mode="new" typeId={typeId} />}
        editBody={editId ? <AttributeFormBody mode="edit" id={editId} typeId={typeId} /> : null}
      />
    </div>
  )
}
