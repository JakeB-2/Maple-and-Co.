import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { requireAuth } from '@/lib/auth/dal'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { todayInTimeZone } from '@/lib/format-date'
import { daysBetween } from '@/lib/recurrence'
import { fetchRecentPartnerSpends } from '@/lib/queries/spends'
import { fetchProfiles } from '@/lib/queries/profiles'
import { fetchRecentPartnerGroceryAdds } from '@/lib/queries/grocery-list'
import { formatSpendAmount } from '@/lib/queries/spend-totals'
import { fetchEntities, type EntityRow } from '@/lib/queries/entities'
import { fetchHouseholdSettings } from '@/lib/queries/household-settings'
import { fetchAllNeeds, type NeedWithEntity } from '@/lib/queries/needs'
import { fetchLatestEventPerType } from '@/lib/queries/entity-events'
import { recencyState } from '@/lib/queries/need-recency'
import { fetchCalendarEvents, fetchEventExclusions } from '@/lib/queries/calendar-events'
import { expandEventOccurrences, type EventOccurrence } from '@/lib/queries/calendar-window'
import { fetchTasks, fetchLatestCompletions } from '@/lib/queries/tasks'
import { buildTaskBoard } from '@/lib/queries/task-freshness'
import { Card, CardContent } from '@/components/ui/card'
import { Surface } from '@/components/screens/surface'
import { AvatarChip } from '@/components/shell/avatar-chip'
import { PageHeader } from '@/components/shell/page-header'
import { RecencyChip } from '@/components/shell/recency-chip'
import { freshnessColor } from '@/components/calendar/freshness-color'

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

// An occurrence's clock label: all-day / untimed reads 'All day', otherwise the
// 'HH:MM' start folds to a warm 12-hour label. Pure string math — SSR-safe.
function occurrenceTimeLabel(occurrence: EventOccurrence): string {
  const { all_day, start_time } = occurrence.event
  if (all_day || start_time === null) return 'All day'
  const [h, m] = start_time.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

// A task's due date relative to household today: 'due today', 'N days ago' (past
// due), or 'due in N days' (an aging task not yet due). Never an "overdue" scold
// (D-017) — the freshness fade already carries the urgency.
function dueLabel(dueOn: string, today: string): string {
  if (dueOn === today) return 'due today'
  const days = daysBetween(dueOn, today) // positive once dueOn is in the past
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`
  const ahead = -days
  return ahead === 1 ? 'due tomorrow' : `due in ${ahead} days`
}

// Today digest. Grows a section per milestone: partner spends (M1), grocery
// adds (M2), needs chips per entity (M3, generalized in M6 by D-032),
// occurrences + fading tasks (M4).
export default async function TodayPage() {
  const { user, supabase } = await requireAuth()
  const today = todayInTimeZone(HOUSEHOLD_TZ)
  const [members, partnerSpends, partnerGroceryAdds, pets, plants, allNeeds, events, exclusions, tasks, latestCompletions, household] =
    await Promise.all([
      fetchProfiles(supabase),
      fetchRecentPartnerSpends(supabase, user.id),
      fetchRecentPartnerGroceryAdds(supabase, user.id, 5),
      fetchEntities(supabase, 'pet'),
      fetchEntities(supabase, 'plant'),
      fetchAllNeeds(supabase),
      fetchCalendarEvents(supabase),
      fetchEventExclusions(supabase),
      fetchTasks(supabase),
      fetchLatestCompletions(supabase),
      fetchHouseholdSettings(supabase),
    ])

  // One chip group per entity that has Today-facing needs (D-032). The
  // per-entity latest map trails the parallel batch because it needs entity
  // ids; the RPC keeps infrequent types from hiding behind daily logs.
  const entities: EntityRow[] = [...pets, ...plants]
  const todayNeeds = allNeeds.filter((need) => need.show_on_today)
  const needGroups: { entity: EntityRow; needs: NeedWithEntity[] }[] = entities
    .map((entity) => ({ entity, needs: todayNeeds.filter((need) => need.entity.id === entity.id) }))
    .filter((group) => group.needs.length > 0)
  const latestByEntity = new Map(
    await Promise.all(
      needGroups.map(
        async (group) => [group.entity.id, await fetchLatestEventPerType(supabase, group.entity.id)] as const
      )
    )
  )

  const { dateLabel, greeting } = householdNow()
  const now = new Date()

  // Today's occurrences: fold the flat exclusion rows into per-event date sets,
  // then expand every event across the single-day [today, today] window.
  const exclusionsByEvent = new Map<string, Set<string>>()
  for (const exclusion of exclusions) {
    const dates = exclusionsByEvent.get(exclusion.event_id)
    if (dates) dates.add(exclusion.occurs_on)
    else exclusionsByEvent.set(exclusion.event_id, new Set([exclusion.occurs_on]))
  }
  const todayOccurrences = expandEventOccurrences(events, exclusionsByEvent, { start: today, end: today })

  // The digest only nudges tasks that have started to age or come due — a fresh
  // task (done recently enough) is quietly left off so Today stays a short list.
  const board = buildTaskBoard(tasks, latestCompletions, today)
  const needsDoing = board.filter((row) => !row.done && !row.completedToday && row.stage !== 'fresh')

  // The closing "house is quiet" card is a genuine empty state — only show it
  // when nothing above it rendered. On a busy day it would otherwise contradict
  // the digest it sits under.
  const digestEmpty =
    partnerSpends.length === 0 &&
    partnerGroceryAdds.length === 0 &&
    needGroups.length === 0 &&
    todayOccurrences.length === 0 &&
    needsDoing.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting-as-title (D-033); Settings gear is gone — More Actions in the
          nav carries the menu-tier pages now. The household photo (set at
          /household) gets its one ambient render site here. */}
      <PageHeader
        title={<>{greeting} ☀️</>}
        subtitle={dateLabel}
        actions={
          household.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
            <img
              src={`/media/${household.photo_path}`}
              alt="Home"
              className="size-10 rounded-full border object-cover"
            />
          ) : undefined
        }
      />

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
        {entities.map((entity) => (
          <span
            key={entity.id}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
          >
            <span className="size-4 rounded-full bg-primary" aria-hidden />
            {entity.name} {entity.kind === 'pet' ? '🐾' : '🌱'}
          </span>
        ))}
      </div>

      {partnerSpends.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Latest spends</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {partnerSpends.map((spend) => (
                <li key={spend.id}>
                  <Link
                    href={`/finance?selected=${spend.id}`}
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

      {needGroups.map(({ entity, needs }) => {
        const lastLogged = latestByEntity.get(entity.id) ?? new Map<string, string>()
        // Chips deep-link into the entity's capture flow — one tap from the
        // digest to logging the thing that's due.
        const captureHref = `/${entity.kind === 'pet' ? 'pets' : 'plants'}/${entity.id}?capture=1`
        return (
          <section key={entity.id} className="flex flex-col gap-1.5">
            <h2 className="px-1 text-eyebrow text-muted-foreground">{entity.name}</h2>
            <div className="flex flex-wrap gap-2">
              {needs.map((need) => {
                const last = lastLogged.get(need.event_type_id) ?? null
                return (
                  <RecencyChip
                    key={need.id}
                    emoji={need.event_type.emoji}
                    label={need.event_type.name}
                    timeAgo={last ? formatDistanceToNowStrict(new Date(last), { addSuffix: true }) : null}
                    state={recencyState(last, need, now)}
                    href={captureHref}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      {todayOccurrences.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Today</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {todayOccurrences.map((occurrence) => (
                <li key={occurrence.key}>
                  <Link
                    href={`/calendar?selected=${occurrence.key}`}
                    className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
                  >
                    <span className="text-lg" aria-hidden>
                      📅
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{occurrence.event.title}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {occurrenceTimeLabel(occurrence)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      )}

      {needsDoing.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-eyebrow text-muted-foreground">Needs doing</h2>
          <Surface className="overflow-hidden">
            <ul className="hairline-rows">
              {needsDoing.map((row) => (
                <li key={row.task.id}>
                  <Link
                    href={`/tasks?selected=${row.task.id}`}
                    className="flex min-h-14 touch:min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: freshnessColor(row.ratio) }}
                      aria-hidden
                    />
                    <span className="text-lg" aria-hidden>
                      {row.task.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{row.task.title}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {dueLabel(row.dueOn, today)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      )}

      {digestEmpty && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            For now: the house is quiet. 🐕
          </CardContent>
        </Card>
      )}
    </div>
  )
}
