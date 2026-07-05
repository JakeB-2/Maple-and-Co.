import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { sanitizeUuidParam } from '@/lib/utils'
import { parseDateOnlyLocal, todayInTimeZone } from '@/lib/format-date'
import { fetchSpend, fetchSpendsForMonth } from '@/lib/queries/spends'
import { fetchComments, fetchReactions } from '@/lib/queries/comments'
import { fetchProfiles } from '@/lib/queries/profiles'
import { ResourceFormDrawers } from '@/components/screens/resource-form-drawers'
import { SpendList } from '@/components/spending/spend-list'
import { TotalsCards } from '@/components/spending/totals-cards'
import { SpendDetailDrawer } from '@/components/spending/spend-detail-drawer'
import { SpendFormBody } from '@/components/spending/spend-form-body'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function shiftMonth(month: string, delta: -1 | 1): string {
  const [y, m] = month.split('-').map(Number)
  const shifted = new Date(y, m - 1 + delta, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

function MonthNav({ month }: { month: string }) {
  const label = format(parseDateOnlyLocal(`${month}-01`) ?? new Date(), 'MMMM yyyy')
  return (
    <nav className="flex items-center justify-between" aria-label="Month">
      <Button asChild variant="ghost" size="icon" aria-label="Previous month">
        <Link href={`/spending?month=${shiftMonth(month, -1)}`}>
          <ChevronLeft />
        </Link>
      </Button>
      <h2 className="text-base font-semibold">{label}</h2>
      <Button asChild variant="ghost" size="icon" aria-label="Next month">
        <Link href={`/spending?month=${shiftMonth(month, 1)}`}>
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  )
}

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; selected?: string; new?: string; edit?: string }>
}) {
  const { user, supabase } = await requireAuth()
  const params = await searchParams

  const today = todayInTimeZone(HOUSEHOLD_TZ)
  const month = params.month && MONTH_RE.test(params.month) ? params.month : today.slice(0, 7)
  const selectedId = sanitizeUuidParam(params.selected)
  const editId = sanitizeUuidParam(params.edit)

  const [spends, selected, comments, reactions, profiles] = await Promise.all([
    fetchSpendsForMonth(supabase, month),
    selectedId ? fetchSpend(supabase, selectedId) : null,
    selectedId ? fetchComments(supabase, 'spend', selectedId) : [],
    selectedId ? fetchReactions(supabase, 'spend', selectedId) : [],
    fetchProfiles(supabase),
  ])

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Spend</h1>
        <p className="text-sm text-muted-foreground">The shared diary — who bought what.</p>
      </header>

      <MonthNav month={month} />
      <TotalsCards spends={spends} />
      <SpendList spends={spends} selectedId={selectedId} today={today} />

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
