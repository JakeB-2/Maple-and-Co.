import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchStores } from '@/lib/queries/stores'
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
      <header className="pt-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Stores</h1>
        <p className="text-sm text-muted-foreground">
          Where you shop — tap a store to lay out its sections.
        </p>
      </header>

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
