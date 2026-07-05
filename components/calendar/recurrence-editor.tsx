'use client'

// Controlled recurrence editor — emits a RecurrenceRule | null (one-off) up to
// the form (D-015). Preset chips for the common cases, inline controls for the
// details, and a plain-language echo ("Every 2 weeks on Tue, Thu") so the
// household never has to reason about the underlying columns.
//
// mode='event' is fixed-only (D-015: events never chase completion). mode='task'
// adds the fixed / after_done toggle ("On a schedule" vs "After last done"); in
// after_done the weekday/day-of-month controls are hidden because the engine
// ignores them (there is exactly one projected due date).

import type { RecurrenceRule, RecurUnit, RecurSemantics } from '@/lib/recurrence/types'
import { parseYmd, weekdayOf } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const WEEKDAYS = [
  { i: 0, short: 'S', full: 'Sun' },
  { i: 1, short: 'M', full: 'Mon' },
  { i: 2, short: 'T', full: 'Tue' },
  { i: 3, short: 'W', full: 'Wed' },
  { i: 4, short: 'T', full: 'Thu' },
  { i: 5, short: 'F', full: 'Fri' },
  { i: 6, short: 'S', full: 'Sat' },
] as const

const UNIT_LABEL: Record<RecurUnit, { one: string; many: string }> = {
  day: { one: 'day', many: 'days' },
  week: { one: 'week', many: 'weeks' },
  month: { one: 'month', many: 'months' },
  year: { one: 'year', many: 'years' },
}

const UNIT_OPTIONS: RecurUnit[] = ['day', 'week', 'month', 'year']

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function unitWord(unit: RecurUnit, interval: number): string {
  const label = UNIT_LABEL[unit]
  return interval === 1 ? label.one : `${interval} ${label.many}`
}

/** The plain-language echo of a rule (uses the anchor's weekday when weekly with
 *  no explicit day, matching the engine's fallback). */
export function describeRecurrence(rule: RecurrenceRule | null, anchorDate: string): string {
  if (rule === null) return 'Does not repeat'

  const suffix =
    rule.semantics === 'after_done'
      ? ' after it’s last done'
      : rule.until
        ? ` until ${rule.until}`
        : ''

  if (rule.semantics === 'after_done') {
    return `Every ${unitWord(rule.unit, rule.interval)}${suffix}`
  }

  switch (rule.unit) {
    case 'day':
      return `Every ${unitWord('day', rule.interval)}${suffix}`
    case 'week': {
      const days = rule.weekdays.length ? [...rule.weekdays].sort((a, b) => a - b) : [weekdayOf(anchorDate)]
      const names = days.map((d) => WEEKDAYS[d].full).join(', ')
      return `Every ${unitWord('week', rule.interval)} on ${names}${suffix}`
    }
    case 'month': {
      const day = rule.monthDay ?? parseYmd(anchorDate).day
      return `Every ${unitWord('month', rule.interval)} on the ${ordinal(day)}${suffix}`
    }
    case 'year':
      return `Every ${unitWord('year', rule.interval)}${suffix}`
  }
}

type Preset = { key: string; label: string; build: (anchor: string, semantics: RecurSemantics, until: string | null) => RecurrenceRule | null }

const PRESETS: Preset[] = [
  { key: 'none', label: 'Does not repeat', build: () => null },
  {
    key: 'daily',
    label: 'Daily',
    build: (_a, semantics, until) => ({ unit: 'day', interval: 1, weekdays: [], monthDay: null, semantics, until }),
  },
  {
    key: 'weekly',
    label: 'Weekly',
    build: (a, semantics, until) => ({
      unit: 'week',
      interval: 1,
      weekdays: [weekdayOf(a)],
      monthDay: null,
      semantics,
      until,
    }),
  },
  {
    key: 'monthly',
    label: 'Monthly',
    build: (a, semantics, until) => ({
      unit: 'month',
      interval: 1,
      weekdays: [],
      monthDay: parseYmd(a).day,
      semantics,
      until,
    }),
  },
  {
    key: 'yearly',
    label: 'Yearly',
    build: (_a, semantics, until) => ({ unit: 'year', interval: 1, weekdays: [], monthDay: null, semantics, until }),
  },
]

function presetKeyOf(rule: RecurrenceRule | null): string {
  if (rule === null) return 'none'
  if (rule.interval === 1 && rule.semantics === 'fixed') {
    if (rule.unit === 'day') return 'daily'
    if (rule.unit === 'week') return 'weekly'
    if (rule.unit === 'month') return 'monthly'
    if (rule.unit === 'year') return 'yearly'
  }
  return rule.unit === 'day' ? 'daily' : rule.unit === 'week' ? 'weekly' : rule.unit === 'month' ? 'monthly' : 'yearly'
}

export function RecurrenceEditor({
  value,
  onChange,
  anchorDate,
  mode = 'task',
}: {
  value: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
  anchorDate: string
  mode?: 'event' | 'task'
}) {
  const semantics: RecurSemantics = value?.semantics ?? 'fixed'
  const activePreset = presetKeyOf(value)

  function patch(next: Partial<RecurrenceRule>) {
    if (value === null) return
    onChange({ ...value, ...next })
  }

  function pickPreset(preset: Preset) {
    onChange(preset.build(anchorDate, semantics, value?.until ?? null))
  }

  function toggleWeekday(i: number) {
    if (value === null) return
    const set = new Set(value.weekdays)
    if (set.has(i)) set.delete(i)
    else set.add(i)
    patch({ weekdays: [...set].sort((a, b) => a - b) })
  }

  const showDetails = value !== null
  const isAfterDone = semantics === 'after_done'

  return (
    <div className="flex flex-col gap-3">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const active = activePreset === preset.key || (preset.key === 'none' && value === null)
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => pickPreset(preset)}
              aria-pressed={active}
              className={cn(
                'inline-flex min-h-9 touch:min-h-10 items-center rounded-full border px-3 text-sm transition-colors',
                active ? 'border-primary bg-primary-soft font-medium' : 'hover:bg-surface-2'
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {showDetails && value !== null && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          {/* Task-only: on a schedule vs after last done */}
          {mode === 'task' && (
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
              {(
                [
                  { key: 'fixed', label: 'On a schedule' },
                  { key: 'after_done', label: 'After last done' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => patch({ semantics: opt.key })}
                  aria-pressed={semantics === opt.key}
                  className={cn(
                    'min-h-9 rounded text-sm transition-colors',
                    semantics === opt.key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Every N unit */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Every</span>
            <Input
              type="number"
              min={1}
              value={value.interval}
              onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16"
              aria-label="Interval"
            />
            <select
              value={value.unit}
              onChange={(e) => {
                const unit = e.target.value as RecurUnit
                // Fixed monthly needs monthDay (schema refine); seed it from the
                // anchor so the value matches the day the 'On day' input shows —
                // otherwise the rule is silently invalid on submit.
                patch(
                  unit === 'month' && value.monthDay === null
                    ? { unit, monthDay: parseYmd(anchorDate).day }
                    : { unit }
                )
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Unit"
            >
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {value.interval === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many}
                </option>
              ))}
            </select>
          </div>

          {/* Weekly weekday picker (fixed only) */}
          {!isAfterDone && value.unit === 'week' && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Days of the week">
              {WEEKDAYS.map((wd) => {
                const on = value.weekdays.includes(wd.i)
                return (
                  <button
                    key={wd.i}
                    type="button"
                    onClick={() => toggleWeekday(wd.i)}
                    aria-pressed={on}
                    aria-label={wd.full}
                    className={cn(
                      'size-9 touch:size-10 rounded-full border text-sm transition-colors',
                      on ? 'border-primary bg-primary-soft font-medium' : 'hover:bg-surface-2'
                    )}
                  >
                    {wd.short}
                  </button>
                )
              })}
            </div>
          )}

          {/* Monthly day-of-month (fixed only) */}
          {!isAfterDone && value.unit === 'month' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">On day</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={value.monthDay ?? parseYmd(anchorDate).day}
                onChange={(e) =>
                  patch({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
                }
                className="w-16"
                aria-label="Day of month"
              />
              <span className="text-muted-foreground">(clamped to the month’s last day)</span>
            </div>
          )}

          {/* Optional end date (fixed only — after_done has no series to end) */}
          {!isAfterDone && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ends on</span>
              <Input
                type="date"
                min={anchorDate}
                value={value.until ?? ''}
                onChange={(e) => patch({ until: e.target.value || null })}
                className="w-40"
                aria-label="Ends on"
              />
            </label>
          )}

          <p className="text-sm text-muted-foreground">{describeRecurrence(value, anchorDate)}</p>
        </div>
      )}
    </div>
  )
}
