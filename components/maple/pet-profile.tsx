'use client'

import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Pencil } from 'lucide-react'
import type { PetRow } from '@/lib/queries/pets'
import type { RecencyState } from '@/lib/queries/pet-recency'
import type { MedsCountdown } from '@/lib/queries/task-freshness'
import { toEpochDay } from '@/lib/recurrence'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { parseDateOnlyLocal, todayInTimeZone } from '@/lib/format-date'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { Surface } from '@/components/screens/surface'
import { RecencyChip } from '@/components/shell/recency-chip'
import { Sparkline } from '@/components/shell/sparkline'
import { Button } from '@/components/ui/button'

type PetProfileProps = {
  pet: PetRow
  chips: {
    typeId: string
    emoji: string
    name: string
    timeAgo: string | null
    state: RecencyState
  }[]
  weightSeries: { occurred_at: string; kg: number }[]
  lastMeds: string | null
  medsCountdown: MedsCountdown
}

// Whole-DAY meds countdown (D-026 is day-granular, like the tasks board). Using
// formatDistanceToNowStrict on a midnight would leak hour/minute granularity
// ("in 4 hours") the evening before a dose.
function medsLabel(dueOn: string, today: string): string {
  const diff = toEpochDay(dueOn) - toEpochDay(today)
  if (diff <= 0) return '💊 Meds due'
  if (diff === 1) return '💊 Next dose tomorrow'
  return `💊 Next dose in ${diff} days`
}

// '3 years old'; months under a year. Tiny local date math, no library.
function ageLabel(birthday: string, now = new Date()): string | null {
  const born = parseDateOnlyLocal(birthday)
  if (!born || born > now) return null
  let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth()
  if (now.getDate() < born.getDate()) months -= 1
  if (months < 1) return 'Less than a month old'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} old`
}

export function PetProfile({ pet, chips, weightSeries, lastMeds, medsCountdown }: PetProfileProps) {
  const layer = useDrawerNavHref()
  const age = pet.birthday ? ageLabel(pet.birthday) : null
  const latestWeight = weightSeries[weightSeries.length - 1]
  const today = todayInTimeZone(HOUSEHOLD_TZ)

  return (
    <section className="flex flex-col gap-3">
      <Surface className="flex items-center gap-4 p-4">
        {pet.photo_path ? (
          // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
          <img
            src={`/media/${pet.photo_path}`}
            alt={pet.name}
            className="size-20 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-soft text-4xl"
            aria-hidden
          >
            🐕
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
          {age && <p className="text-sm text-muted-foreground">{age}</p>}
        </div>
        <Button asChild variant="ghost" size="icon" aria-label={`Edit ${pet.name}`}>
          <Link href={layer(`/maple?edit_pet=${pet.id}`)}>
            <Pencil />
          </Link>
        </Button>
      </Surface>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {chips.map((chip) => (
            <RecencyChip
              key={chip.typeId}
              emoji={chip.emoji}
              label={chip.name}
              timeAgo={chip.timeAgo}
              state={chip.state}
            />
          ))}
        </div>
      )}

      {latestWeight && (
        <Surface className="flex flex-col gap-2 p-4">
          <h2 className="text-eyebrow text-muted-foreground">Weight</h2>
          <p className="text-2xl font-bold tracking-tight">{latestWeight.kg} kg</p>
          <Sparkline points={weightSeries.map((point) => point.kg)} className="h-10 w-full text-primary" />
          <p className="text-xs text-muted-foreground">
            over {weightSeries.length} weigh-in{weightSeries.length === 1 ? '' : 's'}
          </p>
        </Surface>
      )}

      {lastMeds && (
        <p className="px-1 text-sm text-muted-foreground">
          💊 Last meds {formatDistanceToNowStrict(new Date(lastMeds), { addSuffix: true })}
        </p>
      )}

      {medsCountdown && (
        <p className="px-1 text-sm text-muted-foreground">{medsLabel(medsCountdown.dueOn, today)}</p>
      )}
    </section>
  )
}
