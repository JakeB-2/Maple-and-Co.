// A store's section layout — drill-down from /groceries/stores (D-033).

import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchStore, fetchStoreSections } from '@/lib/queries/stores'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { SectionList } from '@/components/settings/section-list'
import { SectionFormBody } from '@/components/settings/section-form-body'

export const dynamic = 'force-dynamic'

export default async function StoreSectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { supabase } = await requireAuth()
  const { storeId: rawStoreId } = await params
  const search = await searchParams

  const storeId = sanitizeUuidParam(rawStoreId)
  if (!storeId) notFound()
  const editId = sanitizeUuidParam(search.edit)

  const [store, sections] = await Promise.all([
    fetchStore(supabase, storeId),
    fetchStoreSections(supabase, storeId),
  ])
  if (!store) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${store.emoji} ${store.name}`}
        subtitle="Top to bottom = your walk through the store."
        backHref="/groceries/stores"
        backLabel="Stores"
      />

      <SectionList
        storeId={storeId}
        sections={sections.map(({ id, name }) => ({ id, name }))}
      />

      <ResourceFormDrawers
        isNew={search.new === '1'}
        editId={editId}
        newTitle="New section"
        editTitle="Edit section"
        newSize="sm"
        editSize="sm"
        newBody={<SectionFormBody mode="new" storeId={storeId} />}
        editBody={editId ? <SectionFormBody mode="edit" id={editId} storeId={storeId} /> : null}
      />
    </div>
  )
}
