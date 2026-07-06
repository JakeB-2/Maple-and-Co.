// Async server body for the catalog-item edit drawer.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchGroceryItem } from '@/lib/queries/grocery-catalog'
import { ItemForm, type ItemFormDefaults } from './item-form'

type ItemFormBodyProps = { mode: 'edit'; id: string; selectedEntryId?: string | null }

export async function ItemFormBody(props: ItemFormBodyProps) {
  const { supabase } = await requireAuth()
  const item = await fetchGroceryItem(supabase, props.id)

  if (!item) {
    return (
      <FormBodyNotFound noun="item" />
    )
  }

  const defaults: ItemFormDefaults = {
    name: item.name,
    emoji: item.emoji,
    default_qty: item.default_qty ?? '',
  }
  return (
    <ItemForm
      mode="edit"
      id={item.id}
      defaultValues={defaults}
      selectedEntryId={props.selectedEntryId}
    />
  )
}
