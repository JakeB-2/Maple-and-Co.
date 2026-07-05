'use client'

// Compact period dropdown for stats / matrix surfaces. Presets only (7d, 30d,
// 90d, year, MTD, YTD, all). Calendar / custom date range UI is deferred
// until a third independent surface asks for it.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type PeriodValue = '7' | '30' | '90' | '365' | 'mtd' | 'ytd' | 'all'

const OPTIONS: Array<{ value: PeriodValue; label: string }> = [
  { value: '7',   label: 'Last 7 days' },
  { value: '30',  label: 'Last 30 days' },
  { value: '90',  label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
]

export function PeriodPicker({
  value,
  onChange,
  ariaLabel = 'Period',
  className = 'h-7 touch:h-9 text-xs w-32',
}: {
  value: PeriodValue
  onChange: (v: PeriodValue) => void
  ariaLabel?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodValue)}>
      <SelectTrigger size="sm" className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function periodCutoffMs(period: PeriodValue): number {
  if (period === 'all') return 0
  if (period === 'mtd') {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  }
  if (period === 'ytd') {
    const d = new Date()
    return new Date(d.getFullYear(), 0, 1).getTime()
  }
  return Date.now() - Number(period) * 86_400_000
}
