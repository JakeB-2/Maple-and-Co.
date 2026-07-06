'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import type { EntityRow } from '@/lib/queries/entities'
import type { RecencyState } from '@/lib/queries/need-recency'
import { toEpochDay } from '@/lib/recurrence'
import { HOUSEHOLD_TZ } from '@/lib/config'
import { parseDateOnlyLocal, todayInTimeZone } from '@/lib/format-date'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useSoftDeleteWithUndo } from '@/lib/hooks/use-soft-delete-with-undo'
import { Surface } from '@/components/screens/surface'
import { RecencyChip } from '@/components/shell/recency-chip'
import { Sparkline } from '@/components/shell/sparkline'
import { Button } from '@/components/ui/button'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { KIND_COPY, entityPath } from '@/components/entities/entity-kind'

export type NeedChip = {
  needId: string
  emoji: string
  name: string
  timeAgo: string | null
  state: RecencyState
}

/** A need whose schedule lives on a linked live task (the Meds pattern, D-026). */
export type NeedCountdownLine = {
  needId: string
  emoji: string
  name: string
  dueOn: string
}

type EntityProfileProps = {
  entity: EntityRow
  chips: NeedChip[]
  weightSeries: { occurred_at: string; kg: number }[]
  countdowns: NeedCountdownLine[]
}

// Whole-DAY need countdown (D-026 is day-granular, like the tasks board). Using
// formatDistanceToNowStrict on a midnight would leak hour/minute granularity
// ("in 4 hours") the evening before it's due.
function countdownLabel(line: NeedCountdownLine, today: string): string {
  const diff = toEpochDay(line.dueOn) - toEpochDay(today)
  if (diff <= 0) return `${line.emoji} ${line.name} due`
  if (diff === 1) return `${line.emoji} ${line.name} due tomorrow`
  return `${line.emoji} ${line.name} due in ${diff} days`
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

export function EntityProfile({ entity, chips, weightSeries, countdowns }: EntityProfileProps) {
  const layer = useDrawerNavHref()
  const router = useRouter()
  const { runDelete, deletingId } = useSoftDeleteWithUndo()
  const copy = KIND_COPY[entity.kind]
  const age = entity.birthday ? ageLabel(entity.birthday) : null
  const latestWeight = weightSeries[weightSeries.length - 1]
  const today = todayInTimeZone(HOUSEHOLD_TZ)
  const basePath = entityPath(entity.kind, entity.id)

  // Households remove entities too (a plant dies 🪦). Safe despite the hook's
  // cascade caveat by D-023's precedent: needs/events are only reachable
  // through the entity, so tombstoning it hides them and restore is symmetric.
  // Navigate to the index first — this profile route 404s once deleted.
  async function deleteEntity() {
    const deleted = await runDelete({
      table: 'entities',
      id: entity.id,
      noun: copy.noun,
      label: entity.name,
    })
    if (deleted) router.push(copy.base)
  }

  return (
    <section className="flex flex-col gap-3">
      <Surface className="flex items-center gap-4 p-4">
        {entity.photo_path ? (
          // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
          <img
            src={`/media/${entity.photo_path}`}
            alt={entity.name}
            className="size-20 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-soft text-4xl"
            aria-hidden
          >
            {copy.emoji}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* The name itself lives in the PageHeader (D-033) — this card carries
              the photo + age so the header stays the single h1. */}
          {age && <p className="text-sm text-muted-foreground">{age}</p>}
        </div>
        <Button asChild variant="ghost" size="icon" aria-label={`Edit ${entity.name}`}>
          <Link href={layer(`${basePath}?edit_entity=${entity.id}`)}>
            <Pencil />
          </Link>
        </Button>
        <MoreActionsMenu
          triggerLabel={`Actions for ${entity.name}`}
          actions={[
            {
              label: `Delete ${copy.noun.toLowerCase()}`,
              icon: Trash2,
              destructive: true,
              disabled: deletingId === entity.id,
              onSelect: deleteEntity,
            },
          ]}
        />
      </Surface>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {chips.map((chip) => (
            <RecencyChip
              key={chip.needId}
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

      {countdowns.map((line) => (
        <p key={line.needId} className="px-1 text-sm text-muted-foreground">
          {countdownLabel(line, today)}
        </p>
      ))}
    </section>
  )
}
