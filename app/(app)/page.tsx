import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { Card, CardContent } from '@/components/ui/card'

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
  const { supabase } = await requireAuth()
  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, signature_color')
    .order('display_name')

  const { dateLabel, greeting } = householdNow()

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="text-2xl font-bold tracking-tight">{greeting} ☀️</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {(members ?? []).map((member) => (
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

      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          The digest fills in as features land — spends, groceries, Maple&apos;s day, and
          what&apos;s due. For now: the house is quiet. 🐕
        </CardContent>
      </Card>
    </div>
  )
}
