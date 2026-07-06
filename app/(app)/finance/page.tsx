import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { todayInTimeZone } from '@/lib/format-date'
import { fetchRecentSpends, fetchSpend, fetchSpendsForMonth } from '@/lib/queries/spends'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { PageHeader } from '@/components/shell/page-header'
import { HeaderMenu } from '@/components/shell/header-menu'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { SpendTable } from '@/components/spending/spend-table'
import { TotalsCards } from '@/components/spending/totals-cards'
import { SpendDetailDrawer } from '@/components/spending/spend-detail-drawer'
import { SpendFormBody } from '@/components/spending/spend-form-body'

export const dynamic = 'force-dynamic'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; new?: string; edit?: string }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  // Totals always show the CURRENT month (D-033: the ?month= pager died with
  // the IA rework; browsing history is the sortable table's job now).
  const month = todayInTimeZone(HOUSEHOLD_TZ).slice(0, 7)
  const selectedId = sanitizeUuidParam(params.selected)
  const editId = sanitizeUuidParam(params.edit)

  const [monthSpends, recentSpends, selected, comments, reactions, profiles] = await Promise.all([
    fetchSpendsForMonth(supabase, month),
    fetchRecentSpends(supabase),
    selectedId ? fetchSpend(supabase, selectedId) : null,
    selectedId ? fetchComments(supabase, 'spend', selectedId) : [],
    selectedId ? fetchReactions(supabase, 'spend', selectedId) : [],
    fetchProfiles(supabase),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finance"
        subtitle="The shared diary — who bought what."
        actions={<HeaderMenu items={[{ label: 'Categories', href: '/finance/categories' }]} />}
      />

      {monthSpends.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">This month</h2>
          <TotalsCards spends={monthSpends} />
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <h2 className="px-1 text-eyebrow text-muted-foreground">Recent spends</h2>
        <SpendTable spends={recentSpends} selectedId={selectedId} />
      </section>

      {selected && (
        <SpendDetailDrawer
          spend={selected}
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
        isNew={params.new === '1'}
        editId={editId}
        newTitle="Log a spend"
        editTitle="Edit spend"
        newSize="sm"
        editSize="sm"
        newBody={<SpendFormBody mode="new" />}
        editBody={editId ? <SpendFormBody mode="edit" id={editId} /> : null}
      />
    </div>
  )
}
