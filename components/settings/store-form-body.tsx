// Async server bodies for the store create/edit drawers.

import { requireAuth } from '@/lib/auth/dal'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/config'
import { fetchStores } from '@/lib/queries/stores'
import { StoreForm, type StoreFormDefaults } from './store-form'

type StoreFormBodyProps = { mode: 'new' } | { mode: 'edit'; id: string }

export async function StoreFormBody(props: StoreFormBodyProps) {
  const { supabase } = await requireAuth()
  const stores = await fetchStores(supabase)

  if (props.mode === 'edit') {
    const row = stores.find((store) => store.id === props.id)
    if (!row) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          This store is gone — it may have just been deleted.
        </p>
      )
    }
    const defaults: StoreFormDefaults = {
      name: row.name,
      emoji: row.emoji,
      // The DB CHECK constrains currency to CURRENCIES; the Row type is plain string.
      currency: row.currency as Currency,
      sort_order: row.sort_order,
    }
    return <StoreForm mode="edit" id={row.id} defaultValues={defaults} />
  }

  const nextSortOrder = stores.length > 0 ? Math.max(...stores.map((s) => s.sort_order)) + 1 : 0
  const defaults: StoreFormDefaults = {
    name: '',
    emoji: '',
    currency: DEFAULT_CURRENCY,
    sort_order: nextSortOrder,
  }
  return <StoreForm mode="new" defaultValues={defaults} />
}
