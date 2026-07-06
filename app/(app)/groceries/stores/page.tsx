// Stores live under Groceries now (IA rework D-033): they only exist to shape
// the shopping list, so they moved out of the deleted Settings hub and are
// reached via the Groceries header menu.

import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchStores } from '@/lib/queries/stores'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { StoreList } from '@/components/settings/store-list'
import { StoreFormBody } from '@/components/settings/store-form-body'

export const dynamic = 'force-dynamic'

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>
}) {
  const { supabase } = await requireAuth()
  const params = await searchParams
  const editId = sanitizeUuidParam(params.edit)

  const stores = await fetchStores(supabase)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stores"
        subtitle="Where you shop — tap a store to lay out its sections."
        backHref="/groceries"
        backLabel="Groceries"
      />

      <StoreList
        stores={stores.map(({ id, name, emoji, currency }) => ({ id, name, emoji, currency }))}
      />

      <ResourceFormDrawers
        isNew={params.new === '1'}
        editId={editId}
        newTitle="New store"
        editTitle="Edit store"
        newSize="sm"
        editSize="sm"
        newBody={<StoreFormBody mode="new" />}
        editBody={editId ? <StoreFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
