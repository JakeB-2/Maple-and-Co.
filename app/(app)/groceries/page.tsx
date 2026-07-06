import { requireAuth } from '@/lib/auth/dal'
import { sanitizeUuidParam } from '@/lib/utils'
import { fetchActiveEntries, fetchEntry, fetchRecentEntryItemRefs } from '@/lib/queries/grocery-list'
import { fetchGroceryItems } from '@/lib/queries/grocery-catalog'
import { fetchStores } from '@/lib/queries/stores'
import { fetchPriceHistory } from '@/lib/queries/price-history'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { PageHeader } from '@/components/shell/page-header'
import { HeaderMenu } from '@/components/shell/header-menu'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { GroceryNeedList } from '@/components/groceries/grocery-need-list'
import { ItemDetailDrawer } from '@/components/groceries/item-detail-drawer'
import { EntryFormBody } from '@/components/groceries/entry-form-body'
import { ItemFormBody } from '@/components/groceries/item-form-body'

export const dynamic = 'force-dynamic'

export default async function GroceriesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; edit?: string; edit_item?: string }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  const selectedId = sanitizeUuidParam(params.selected)
  const editId = sanitizeUuidParam(params.edit)
  const editItemId = sanitizeUuidParam(params.edit_item)

  const [entries, catalog, recentRefs, stores, profiles, selected] = await Promise.all([
    fetchActiveEntries(supabase),
    fetchGroceryItems(supabase),
    fetchRecentEntryItemRefs(supabase),
    fetchStores(supabase),
    fetchProfiles(supabase),
    selectedId ? fetchEntry(supabase, selectedId) : null,
  ])

  // Detail extras hang off the selected entry's item — a second round-trip.
  const [prices, comments, reactions] = selected
    ? await Promise.all([
        fetchPriceHistory(supabase, selected.grocery_item_id),
        fetchComments(supabase, 'grocery_item', selected.grocery_item_id),
        fetchReactions(supabase, 'grocery_item', selected.grocery_item_id),
      ])
    : [[], [], []]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groceries"
        subtitle="The shared list — build it at home, shop it together."
        actions={
          // Array style (D-033) so future module options just append here.
          <HeaderMenu items={[{ label: 'Stores & sections', href: '/groceries/stores' }]} />
        }
      />

      <GroceryNeedList
        entries={entries}
        catalog={catalog}
        recentRefs={recentRefs}
        stores={stores}
        selectedId={selectedId}
      />

      {selected && (
        <ItemDetailDrawer
          entry={selected}
          prices={prices}
          comments={comments}
          reactions={reactions}
          profiles={profiles.map(({ id, display_name, signature_color }) => ({
            id,
            display_name,
            signature_color,
          }))}
          currentUserId={user.id}
        />
      )}

      <ResourceFormDrawers
        isNew={false}
        editId={editId}
        newTitle=""
        newBody={null}
        editTitle="Edit entry"
        editSize="sm"
        editBody={editId ? <EntryFormBody mode="edit" id={editId} /> : null}
      />

      <ResourceFormDrawers
        isNew={false}
        editId={editItemId}
        editParam="edit_item"
        newTitle=""
        newBody={null}
        editTitle="Edit item"
        editSize="sm"
        editBody={
          editItemId ? (
            <ItemFormBody mode="edit" id={editItemId} selectedEntryId={selectedId} />
          ) : null
        }
      />
    </div>
  )
}
