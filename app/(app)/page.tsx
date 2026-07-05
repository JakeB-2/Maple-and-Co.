import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Settings } from 'lucide-react'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { fetchRecentPartnerSpends } from '@/lib/queries/spends'
import { fetchProfiles } from '@/lib/queries/profiles'
import { fetchRecentPartnerGroceryAdds } from '@/lib/queries/grocery-list'
import { formatSpendAmount } from '@/lib/queries/spend-totals'
import { Card, CardContent } from '@/components/ui/card'
import { Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function householdNow() {
  const now = new Date()
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: HOUSEHOLD_TZ, hour: 'numeric', hour12: false }).format(now)
  )
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: HOUSEHOLD_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const greeting = hour < 5 ? 'Up late?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return { dateLabel, greeting }
}

// Today digest. Grows a section per milestone: partner spends (M1), grocery
// adds (M2), Maple chips (M3), occurrences + fading tasks (M4).
export default async function TodayPage() {
  const { user, supabase } = await requireAuth()
  const [members, partnerSpends, partnerGroceryAdds] = await Promise.all([
    fetchProfiles(supabase),
    fetchRecentPartnerSpends(supabase, user.id),
    fetchRecentPartnerGroceryAdds(supabase, user.id, 5),
  ])

  const { dateLabel, greeting } = householdNow()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight">{greeting} ☀️</h1>
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="Settings">
          <Link href="/settings">
            <Settings />
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <span
            key={member.id}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
          >
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: member.signature_color }}
              aria-hidden
            />
            {member.display_name}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium">
          <span className="size-4 rounded-full bg-[#c9702e]" aria-hidden />
          Maple 🐾
        </span>
      </div>

      {partnerSpends.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Latest spends</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {partnerSpends.map((spend) => (
                <li key={spend.id}>
                  <Link
                    href={`/spending?selected=${spend.id}`}
                    className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
                  >
                    <AvatarChip
                      name={spend.spent_by.display_name}
                      color={spend.spent_by.signature_color}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{spend.spent_by.display_name}</span> spent{' '}
                      {formatSpendAmount(spend)}
                      {spend.category ? ` on ${spend.category.name.toLowerCase()}` : ''}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(spend.created_at), { addSuffix: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      )}

      {partnerGroceryAdds.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Added to the list</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {partnerGroceryAdds.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/groceries?selected=${entry.id}`}
                    className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
                  >
                    <span className="text-lg" aria-hidden>
                      {entry.item.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{entry.item.name}</span>
                      {entry.qty ? <span className="text-muted-foreground"> · {entry.qty}</span> : ''}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      )}

      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          The digest fills in as features land — Maple&apos;s day and what&apos;s due. For
          now: the house is quiet. 🐕
        </CardContent>
      </Card>
    </div>
  )
}
