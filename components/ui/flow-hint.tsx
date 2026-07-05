import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Always-visible in-flow orientation hint for the app's few multi-step flows.
// Complements HelpHint: HelpHint is reveal-on-demand reference beside a single
// control; FlowHint stays visible so a first-time user sees "what happens
// next" without asking.
//
// Keep usage to genuinely confusing flows — a FlowHint on every panel
// becomes noise.
//
// `activeStep` (0-based) highlights where the record currently sits in the
// sequence; completed steps dim. Omit it for purely static hints.

export type FlowHintStep = {
  /** Short step name shown in bold. */
  label: string
  /** One-sentence explanation of what the step does. */
  detail: string
}

export type FlowHintContent = {
  /** Stable id for the hint (referenced by callers / content registries). */
  id: string
  /** Short Title-Case heading. */
  title: string
  /** Optional one-sentence framing shown above the steps. */
  body?: string
  /** The step sequence; omit for single-thought hints. */
  steps?: FlowHintStep[]
}

export function FlowHint({
  hint,
  activeStep,
  className,
}: {
  hint: FlowHintContent
  /** 0-based index of the step the record is currently on; earlier steps render as done. */
  activeStep?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-transparent bg-muted/50 px-3 py-2.5 text-dense text-muted-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {hint.title}
      </div>
      {hint.body && <p className="mt-1 leading-relaxed">{hint.body}</p>}
      {hint.steps && (
        <ol className="mt-1.5 space-y-1">
          {hint.steps.map((step, i) => {
            const isActive = activeStep === i
            const isDone = activeStep !== undefined && i < activeStep
            return (
              <li key={step.label} className={cn('flex gap-2', isDone && 'opacity-60')}>
                <span
                  className={cn(
                    'select-none tabular-nums',
                    isActive ? 'font-semibold text-foreground' : undefined,
                  )}
                  aria-hidden="true"
                >
                  {i + 1}.
                </span>
                <span className="leading-relaxed">
                  <span className={cn('font-medium', isActive && 'text-foreground')}>
                    {step.label}
                    {isActive && ' (you are here)'}
                  </span>
                  {' — '}
                  {step.detail}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
