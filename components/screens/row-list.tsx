'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronsDownUp, ChevronsUpDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RouteHelpLink } from '@/components/ui/route-help-link'
import { Surface } from './surface'
import { cn } from '@/lib/utils'

// Shared by SectionStack and its child RowLists. `openTarget`/`nonce` drive the
// collapse-all broadcast (RowLists re-sync their open state when nonce changes).
// A RowList that finds this context knows it lives inside a SectionStack and so
// stays boxless — the stack owns the single box (its `boxed` prop). The box lives
// on the stack, never per-section, so sections never nest a card-in-a-card.
const SectionStackCtx = React.createContext<{
  openTarget: boolean
  nonce: number
  // True when any reporting collapsible section is currently open. Exposed so a
  // descendant-hosted collapse-all toggle (see `SectionStackCollapseAll`) can
  // show the right label without re-deriving the state.
  anyOpen: boolean
  // Broadcast collapse-all / expand-all to every descendant RowList. Exposed so
  // the toggle can live on a section's title row even when the sections stream
  // behind a <Suspense> (where SectionStack can't see them to inject it itself).
  toggleAll: () => void
  // Collapsible children report their open state so the collapse-all toggle can
  // prefer "collapse" whenever ANY section is open (including a mixed state).
  reportOpen: (id: string, open: boolean) => void
  unregister: (id: string) => void
} | null>(null)

// Tracks how deeply a RowList is nested inside other RowLists. The body accent
// pill only shows when a section is NESTED (depth > 0) — i.e. a recursive
// nested child — so a top-level section carries no pill while its nested
// children do. No per-section/bespoke flags needed.
const RowListDepthContext = React.createContext(0)

const MobileDetailBackContext = React.createContext(false)

export const ROW_GRID = 'grid items-center gap-3 px-3'

export type RowListVariant = 'card' | 'plain'

function useSelectionBackHref(selectionParam?: string) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()

  return React.useMemo(() => {
    const params = new URLSearchParams(queryString)
    const selectionKey = selectionParam && params.has(selectionParam)
      ? selectionParam
      : params.has('selected')
        ? 'selected'
        : Array.from(params.keys()).find((key) => key.startsWith('selected_'))

    if (!selectionKey) return { active: false, href: null as string | null }

    params.delete(selectionKey)
    if (selectionKey === 'selected') {
      params.delete('new')
      params.delete('edit')
    } else if (selectionKey.startsWith('selected_')) {
      const suffix = selectionKey.slice('selected'.length)
      params.delete(`new${suffix}`)
      params.delete(`edit${suffix}`)
    }

    const qs = params.toString()
    return {
      active: true,
      href: qs ? `${pathname}?${qs}` : pathname,
    }
  }, [pathname, queryString, selectionParam])
}

// Phone-only "back to list" chevron for split-view detail surfaces whose card
// list collapses away once a row is selected (DataTable hides the mobile card
// list when `?selected=` matches). Shares the exact param-stripping logic
// (useSelectionBackHref) and button chrome with SectionStack's built-in back
// affordance, so a hand-rolled detail header can offer the same way back
// without duplicating either. Renders nothing when no selection param
// is active (full-route / non-`?selected=` lenses) and is `md:hidden`, so desktop
// is untouched.
export function MobileDetailBackLink({
  label = 'Back to list',
  selectionParam,
  className,
}: {
  label?: string
  /** Selection query key to clear. Defaults to `selected`, then first `selected_*`. */
  selectionParam?: string
  className?: string
}) {
  const back = useSelectionBackHref(selectionParam)
  if (!back.active || !back.href) return null
  return (
    <Button
      asChild
      variant="ghost"
      size="icon-sm"
      className={cn('mt-[-3px] -ml-1 md:hidden', className)}
      aria-label={label}
    >
      <Link href={back.href} replace scroll={false}>
        <ChevronLeft className="size-4" />
      </Link>
    </Button>
  )
}

// Width-stable Collapse-all / Expand-all toggle. The two labels are stacked in a
// single grid cell so the button keeps the wider label's width and never resizes
// on toggle. Used inline on the first section in flush mode.
function CollapseAllToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-micro text-muted-foreground transition-colors hover:text-foreground"
    >
      {expanded ? <ChevronsDownUp className="size-3" /> : <ChevronsUpDown className="size-3" />}
      <span className="grid justify-items-start">
        <span aria-hidden className="invisible col-start-1 row-start-1">Collapse all</span>
        <span className="col-start-1 row-start-1">{expanded ? 'Collapse all' : 'Expand all'}</span>
      </span>
    </button>
  )
}

// Collapse-all / expand-all toggle wired to the surrounding SectionStack via
// context. Render it inside a descendant section's `titleAction` (e.g. the
// first section's title row) to host the shared control there. This is the
// escape hatch for when the sections stream behind a single <Suspense> — the
// SectionStack can't see its section children to inject the inline toggle
// itself (`items.length === 1`), so a section hosts it from inside instead.
// Renders nothing outside a SectionStack.
export function SectionStackCollapseAll() {
  const group = React.useContext(SectionStackCtx)
  if (!group) return null
  return <CollapseAllToggle expanded={group.anyOpen} onToggle={group.toggleAll} />
}

// A vertical stack of collapsible RowList sections sharing ONE collapse-all
// control and ONE collapse-all broadcast (via SectionStackCtx — children re-sync
// their open state when the user toggles all). The body is identical in both
// modes — borderless, edge-pulled (`-mx-3`) hairline-separated sections with the
// Collapse-all toggle riding on the FIRST section's title row (accordion-standard
// placement). This is the detail-stack grammar. Neither mode draws a box — the
// difference is only the header:
//   - default: a boxless titled header (title / subtitle / badges / actions) that
//     sits flush to the edge of the outer shell (the split-pane aside or the
//     workspace side rail, both borderless). The panel no longer wraps itself
//     in its own card — it reads as one flat section-stack like a drawer detail
//     body. Callers that genuinely need a card-on-a-page (dashboard summaries,
//     the profile form) wrap the SectionStack in <Surface> themselves.
//   - flush: no header at all — the host (a drawer Sheet) supplies the title
//     chrome and the edge padding. Used for drawer detail bodies.
export function SectionStack({
  title,
  subtitle,
  badges,
  actions,
  defaultExpanded = true,
  flush = false,
  boxed = false,
  mobileFlush = false,
  collapseAllInHeader = false,
  children,
  className,
  helpArticleId,
  mobileBackHref,
  mobileBackLabel = 'Back to list',
  mobileBackSelectionParam,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  badges?: React.ReactNode
  actions?: React.ReactNode
  defaultExpanded?: boolean
  /** Edge-pulled, headerless drawer canvas (see component note). */
  flush?: boolean
  /** Card-on-a-page: wrap the (default-mode) stack in the canonical `<Surface>`
   *  box (rounded-lg + border) instead of leaving it boxless. Use on dashboard /
   *  profile / settings-overview / wizard-review surfaces that need a card on a
   *  tinted page — replaces hand-wrapping the SectionStack in `<Surface>`. No
   *  effect in `flush` mode (the host drawer supplies the box). For an elevated
   *  or tinted box, hand-wrap in `<Surface elevated|tinted>` instead. */
  boxed?: boolean
  /** Phone-only full-bleed: negate the page's `px-4` gutter so the panel (header
   *  + sections + back arrow) runs to the screen edges like a native app, then
   *  reclaim that width for data. Desktop (`md+`) is unchanged. Use on a
   *  split-view detail panel that fills the phone viewport. */
  mobileFlush?: boolean
  /** Render the collapse-all toggle in the card header (next to actions) instead
   *  of inline on the first section's title row. Use when the sections stream
   *  behind a single <Suspense> (so there's no first-section title row to host
   *  the inline toggle) — the broadcast still reaches every descendant RowList. */
  collapseAllInHeader?: boolean
  children: React.ReactNode
  className?: string
  /** Override the route-derived help article. Pass null to hide the icon. */
  helpArticleId?: string | null
  /** Mobile-only back href. Undefined derives by removing ?selected; null disables. */
  mobileBackHref?: string | null
  mobileBackLabel?: string
  /** Selection query key to clear. Defaults to `selected`, then first `selected_*`. */
  mobileBackSelectionParam?: string
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [nonce, setNonce] = React.useState(0)
  const parentHasMobileBack = React.useContext(MobileDetailBackContext)
  const selectionBack = useSelectionBackHref(mobileBackSelectionParam)
  const effectiveMobileBackHref =
    mobileBackHref === null || parentHasMobileBack || !selectionBack.active
      ? null
      : mobileBackHref ?? selectionBack.href
  const providesMobileBack = !!effectiveMobileBackHref

  // Collapsible children register their open state here so the toggle knows
  // whether ANY section is currently open. Stable callbacks (no deps) keep child
  // reporting effects from re-firing on every parent render.
  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>({})
  const reportOpen = React.useCallback((id: string, open: boolean) => {
    setOpenStates((current) => (current[id] === open ? current : { ...current, [id]: open }))
  }, [])
  const unregister = React.useCallback((id: string) => {
    setOpenStates((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])
  const anyOpen = Object.values(openStates).some(Boolean)

  function toggleAll() {
    // Prefer collapse: open everything only when every section is already
    // closed; any open section (including a mixed state) collapses all.
    setExpanded(!anyOpen)
    setNonce((current) => current + 1)
  }

  // Inject the Collapse-all toggle onto the first section's titleAction — only
  // when there's more than one section to collapse. When the caller opts into
  // `collapseAllInHeader` (streamed sections behind one <Suspense>), the toggle
  // rides the card header instead and inline injection is skipped.
  const items = React.Children.toArray(children).filter(React.isValidElement)
  const headerToggle = collapseAllInHeader
    ? <CollapseAllToggle expanded={anyOpen} onToggle={toggleAll} />
    : null
  const inlineToggle = !collapseAllInHeader && items.length > 1
    ? <CollapseAllToggle expanded={anyOpen} onToggle={toggleAll} />
    : null
  const rendered = inlineToggle
    ? items.map((child, index) => {
        if (index !== 0) return child
        const el = child as React.ReactElement<{ titleAction?: React.ReactNode }>
        const existing = el.props.titleAction
        return React.cloneElement(el, {
          titleAction: existing ? (<>{existing}{inlineToggle}</>) : inlineToggle,
        })
      })
    : items

  const body = <div className="-mx-3 hairline-rows">{rendered}</div>

  if (flush) {
    return (
      <MobileDetailBackContext.Provider value={parentHasMobileBack}>
        <SectionStackCtx.Provider value={{ openTarget: expanded, nonce, anyOpen, toggleAll, reportOpen, unregister }}>
          <div className={cn('-mx-3 hairline-rows', className)}>{rendered}</div>
        </SectionStackCtx.Provider>
      </MobileDetailBackContext.Provider>
    )
  }

  const hasHeader = title != null || subtitle != null || badges != null || actions != null

  const content = (
    <div className={cn(mobileFlush && '-mx-4 md:mx-0', className)}>
      {hasHeader && (
        <div className={cn('border-b py-2', mobileFlush ? 'px-0 md:px-3' : 'px-3')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-1.5">
              {effectiveMobileBackHref && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  // `mobileFlush` zeroes the header gutter, so drop the -ml-1
                  // nudge there — the button's own padding keeps the chevron
                  // a hair off the screen edge instead of clipping past it.
                  className={cn('mt-[-3px] md:hidden', mobileFlush ? '-ml-0.5' : '-ml-1')}
                  aria-label={mobileBackLabel}
                >
                  <Link href={effectiveMobileBackHref} replace scroll={false}>
                    <ChevronLeft className="size-4" />
                  </Link>
                </Button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {typeof title === 'string' ? (
                    <h2 className="truncate text-record font-semibold leading-tight">{title}</h2>
                  ) : (
                    title
                  )}
                  <RouteHelpLink articleId={helpArticleId} />
                  {badges}
                </div>
                {subtitle && (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
            {(actions || headerToggle) && (
              <div className="flex shrink-0 items-center gap-2">
                {headerToggle}
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {/* px-3 so the body's -mx-3 pulls each section flush to the rail edge —
          the same edge-pulled hairline grammar drawer detail bodies use. */}
      <div className="px-3 py-1.5">{body}</div>
    </div>
  )

  return (
    <MobileDetailBackContext.Provider value={parentHasMobileBack || providesMobileBack}>
      <SectionStackCtx.Provider value={{ openTarget: expanded, nonce, anyOpen, toggleAll, reportOpen, unregister }}>
        {/* `boxed` wraps the stack in the canonical Surface box so dashboard /
            settings / wizard-review surfaces stop hand-rolling their own card. */}
        {boxed ? <Surface>{content}</Surface> : content}
      </SectionStackCtx.Provider>
    </MobileDetailBackContext.Provider>
  )
}

export function RowList({
  title,
  titleAction,
  titleMeta,
  collapsedMeta,
  count,
  collapsible = false,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  header,
  footer,
  children,
  divided = true,
  variant = 'card',
  elevated = false,
  bodyPill = true,
  indentBody = true,
  className,
  bodyClassName,
  titleClassName,
}: {
  title?: React.ReactNode
  titleAction?: React.ReactNode
  titleMeta?: React.ReactNode
  /** Summary shown in the title row ONLY while the section is collapsed (e.g. a
   *  price total or first few names). Hidden when expanded so the body carries
   *  the detail. Requires `collapsible`. */
  collapsedMeta?: React.ReactNode
  count?: number
  collapsible?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  divided?: boolean
  variant?: RowListVariant
  /** Card variant only: lift via shadow instead of a border (border XOR lift).
   *  Use on a tinted canvas (e.g. the detail-drawer body) so the card floats. */
  elevated?: boolean
  /** Suppress the body accent pill (keep the indent). Use when this section's
   *  rows carry their OWN nested pill (e.g. a nested line editor) so only one
   *  pill layer shows at a time. */
  bodyPill?: boolean
  /** Indent the body under the title (the `pl-8` row-grammar indent that lines
   *  rows up past the chevron/pill). Turn OFF for freeform bodies — a nested
   *  DataTable, image, or block — so they sit flush under the section title
   *  instead of being pushed in like a data row. */
  indentBody?: boolean
  className?: string
  bodyClassName?: string
  /** Override the title row's text-size utility (default `text-sm`). Every
   *  other RowList/ActivityRowList/etc. consumer is unaffected — only pass
   *  this at a specific call site that needs a different scale (e.g. a dense
   *  activity list). */
  titleClassName?: string
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const bodyShown = !collapsible || open
  const plain = variant === 'plain'
  const group = React.useContext(SectionStackCtx)
  const depth = React.useContext(RowListDepthContext)
  const isNested = depth > 0
  const firstSync = React.useRef(true)
  const reportId = React.useId()

  React.useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false
      return
    }
    if (group) setOpen(group.openTarget)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.nonce])

  // Report this section's open state up to the SectionStack so its collapse-all
  // toggle can prefer "collapse" whenever any section is open. Only collapsible
  // sections participate (a non-collapsible section is always open and can't be
  // toggled). Deregister on unmount so a removed section doesn't pin anyOpen.
  const reportOpen = group?.reportOpen
  const unregister = group?.unregister
  React.useEffect(() => {
    if (collapsible) reportOpen?.(reportId, open)
  }, [collapsible, open, reportOpen, reportId])
  React.useEffect(() => {
    return () => {
      if (collapsible) unregister?.(reportId)
    }
  }, [collapsible, unregister, reportId])

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  // Only separate the title from the body when the body is actually shown —
  // otherwise a closed section's title border stacks on the inter-section
  // divider below it.
  const titleBorder = bodyShown ? 'hairline-b' : undefined
  const titleText = (
    <span className={cn('truncate font-semibold', titleClassName ?? 'text-sm')}>
      {title}
      {count != null && (
        <span className="ml-1.5 text-micro font-normal tabular-nums text-muted-foreground">({count})</span>
      )}
    </span>
  )

  return (
    <div
      className={cn(
        // `variant` only draws a box when this RowList is STANDALONE (no
        // SectionStack parent). Inside a SectionStack every section is boxless —
        // the stack owns the single box (see SectionStack's `boxed`) and its
        // sections stay flat so we never nest a card-in-a-card. So the card
        // variant lifts (shadow when `elevated`) or borders only when standalone.
        !plain && !group && (elevated
          ? 'overflow-hidden rounded-lg bg-card shadow-[var(--elevation-raised)]'
          : 'overflow-hidden rounded-lg border bg-card'),
        className,
      )}
    >
      {/* No py here: min-h-10 + items-center keeps every title bar a uniform
          height whether it holds plain text or a taller action button. */}
      {title != null && (
        <div className={cn('relative flex min-h-10 items-center justify-between gap-2 px-3', titleBorder)}>
          {/* Header accent pill — left-justified at the row edge, rounded + padded. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-2 left-1.5 w-[3px] rounded-full bg-primary" />
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown
                className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
                aria-hidden
              />
              {titleText}
              {titleMeta && <span className="ml-auto text-micro text-muted-foreground">{titleMeta}</span>}
              {collapsedMeta != null && !open && (
                <span className={cn('text-micro text-muted-foreground', !titleMeta && 'ml-auto')}>{collapsedMeta}</span>
              )}
            </button>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {titleText}
              {titleMeta && <span className="ml-auto text-micro text-muted-foreground">{titleMeta}</span>}
            </span>
          )}
          {titleAction && <div className="shrink-0">{titleAction}</div>}
        </div>
      )}
      {bodyShown && (
        // Children render one nesting level deeper, so a RowList rendered inside
        // another (a recursive child) knows it's nested and shows its pill.
        <RowListDepthContext.Provider value={depth + 1}>
          {(title != null || header != null || footer != null) && indentBody ? (
            // Headered section: indent the content (header, rows, footer). The
            // teal accent pill runs the body range ONLY when this section is
            // itself nested — so only the deepest layer carries a pill.
            // `footer` is included so a footer-only list (e.g. a nested
            // line editor whose column header only appears once it has
            // rows) keeps its Add button at the same indent when empty — the
            // button must not jump left/right as the first row is added.
            <div className="relative pl-8">
              {bodyPill && isNested && (
                <span aria-hidden className="pointer-events-none absolute inset-y-1.5 left-8 w-[3px] rounded-full bg-primary" />
              )}
              {header}
              <div className={cn(divided && 'hairline-rows', bodyClassName)}>{children}</div>
              {footer}
            </div>
          ) : (
            <>
              {header}
              <div className={cn(divided && 'hairline-rows', bodyClassName)}>{children}</div>
              {footer}
            </>
          )}
        </RowListDepthContext.Provider>
      )}
    </div>
  )
}

export function RowListHeader({
  className,
  children,
  tinted = true,
  tintInsetClassName,
  textClassName,
}: {
  className?: string
  children: React.ReactNode
  tinted?: boolean
  /**
   * Inset the tinted fill from the left (e.g. `left-7` to clear a leading
   * chevron/icon column) so the column-label band lines up with the rows'
   * data and reads as belonging to them — not as an extension of the title
   * bar above. The grid itself still spans full width so columns stay aligned.
   */
  tintInsetClassName?: string
  /** Override the header row's text-size utility (default `text-micro`).
   *  Every other consumer is unaffected — only pass this at a specific call
   *  site that needs a different scale (e.g. a dense activity list). */
  textClassName?: string
}) {
  return (
    <div className="relative">
      {tinted && (
        <div
          aria-hidden
          className={cn('absolute inset-y-0 right-0 bg-surface-header', tintInsetClassName ?? 'left-0')}
        />
      )}
      <div
        className={cn(
          ROW_GRID,
          'relative h-8 hairline-b font-semibold uppercase tracking-[0.04em] text-muted-foreground',
          textClassName ?? 'text-micro',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export const RowListAddButton = React.forwardRef<
  HTMLButtonElement,
  {
    label: string
    onClick?: () => void
    indentClassName?: string
  } & React.ComponentPropsWithoutRef<'button'>
>(function RowListAddButton({ label, onClick, indentClassName, className, ...props }, ref) {
  // forwardRef + prop spread so it can back a DropdownMenuTrigger asChild
  // (e.g. an "Add line" trigger that opens a line-type picker) while staying
  // the same visual add-row affordance everywhere else.
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-1.5 hairline-t pr-3 text-dense text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground',
        indentClassName ?? 'pl-3',
        className,
      )}
      {...props}
    >
      <Plus className="size-3.5" />
      {label}
    </button>
  )
})

export function RowListEmpty({
  children,
  textClassName,
}: {
  children: React.ReactNode
  /** Override the empty-state text-size utility (default `text-sm`). Every
   *  other consumer is unaffected. */
  textClassName?: string
}) {
  return <p className={cn('px-3 py-3 text-muted-foreground', textClassName ?? 'text-sm')}>{children}</p>
}

// Opt-in `stackBelow` reflow, expressed PURELY as `max-{bp}:` overrides layered
// on top of the unchanged default grid classes. At/above the breakpoint none of
// the `max-*` variants apply, so the row renders byte-identically to the default
// (grid) path — including any caller `className` override. BELOW the breakpoint
// the row flips to a full-width stacked column (auto height) so each child wraps
// to its own line. Keeping the grid path as the base (not a prefixed restore)
// guarantees desktop is untouched and that a caller's height/padding overrides
// still win there.
const STACK_OVERRIDES = {
  sm: 'max-sm:flex max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:h-auto',
  md: 'max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-2 max-md:h-auto',
} as const

export function InlineEditRow({
  columnsClassName,
  children,
  className,
  stackBelow,
}: {
  columnsClassName: string
  children: React.ReactNode
  className?: string
  /** Opt-in responsive reflow. When set, the row keeps the default grid
   *  AT/ABOVE the breakpoint and flips to a `flex flex-col` stacked column
   *  (each child full-width, auto height) BELOW it via `max-{bp}:` overrides.
   *  Omitted = today's always-grid behavior — leave it unset for grid-only
   *  callers. Pair stacked cells with `<InlineEditField label>` so each gets
   *  a label below the breakpoint (the grid relies on a separate header row
   *  for labels). */
  stackBelow?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        ROW_GRID,
        columnsClassName,
        'h-11 bg-primary/[0.03]',
        stackBelow && STACK_OVERRIDES[stackBelow],
        className,
      )}
    >
      {children}
    </div>
  )
}

// Literal class maps (not template strings) so Tailwind's source scanner sees
// every full class name — `md:contents` / `sm:contents` / `md:hidden` /
// `sm:hidden` would otherwise never be generated.
const FIELD_WRAPPER_AT_BP = {
  sm: 'sm:contents',
  md: 'md:contents',
} as const
const FIELD_LABEL_HIDE_AT_BP = {
  sm: 'sm:hidden',
  md: 'md:hidden',
} as const

// Stacked-cell wrapper for an `InlineEditRow` with `stackBelow`. Below the
// breakpoint it stacks a small field label ABOVE its child cell so phone users
// see the "Date / Resource / Detail / Price" labels the grid omits (the grid
// puts those in a separate header row). AT/ABOVE the breakpoint the wrapper
// collapses to `display:contents` and the label is `hidden`, so the WRAPPED CELL
// becomes the direct grid child again — desktop layout is identical to an
// un-wrapped cell. Wrap each cell child of a `stackBelow` InlineEditRow.
export function InlineEditField({
  label,
  stackBelow,
  children,
  className,
}: {
  label: React.ReactNode
  stackBelow: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', FIELD_WRAPPER_AT_BP[stackBelow], className)}>
      {label !== '' && label != null && (
        <span
          className={cn(
            'text-micro font-medium uppercase tracking-[0.04em] text-muted-foreground',
            FIELD_LABEL_HIDE_AT_BP[stackBelow],
          )}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

export function InlineEditInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  // h-7 dense on pointer; floored to h-9 (~36px) on touch-capable devices.
  return <Input {...props} className={cn('h-7 touch:h-9 px-2 text-dense', className)} />
}

export function InlineEditActions({
  onSave,
  onCancel,
  saveLabel = 'Save row',
  cancelLabel = 'Cancel',
}: {
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button type="button" variant="ghost" size="icon-sm" onClick={onSave} aria-label={saveLabel}>
        <CheckCircle2 className="size-3.5 text-[var(--color-success)]" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label={cancelLabel}>
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

export type LinkedRow = {
  icon?: React.ReactNode
  name: React.ReactNode
  meta?: React.ReactNode
  href?: string
  onClick?: () => void
  actions?: React.ReactNode
}

export function LinkedRowList({
  title,
  headerAction,
  viewAllHref,
  viewAllLabel = 'View all',
  rows,
  emptyMessage = 'None linked.',
  addLabel,
  addIndentClassName,
  onAdd,
  collapsible,
  defaultOpen,
  variant,
  indentBody,
  className,
}: {
  title: React.ReactNode
  headerAction?: React.ReactNode
  viewAllHref?: string
  viewAllLabel?: string
  rows: LinkedRow[]
  emptyMessage?: string
  addLabel?: string
  addIndentClassName?: string
  onAdd?: () => void
  collapsible?: boolean
  defaultOpen?: boolean
  variant?: RowListVariant
  /** Forwarded to the inner RowList. Pass false to sit flush under the section
   *  title inside a flushed detail SectionStack (R-UX-025). Defaults to RowList's
   *  indented body, so existing call sites are unaffected. */
  indentBody?: boolean
  className?: string
}) {
  const titleAction = (
    <>
      {headerAction}
      {viewAllHref && (
        <Link href={viewAllHref} className="text-micro text-primary hover:underline">
          {viewAllLabel}
        </Link>
      )}
    </>
  )

  return (
    <RowList
      className={className}
      title={title}
      titleAction={headerAction || viewAllHref ? titleAction : undefined}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      variant={variant}
      indentBody={indentBody}
      footer={addLabel ? <RowListAddButton label={addLabel} indentClassName={addIndentClassName} onClick={onAdd} /> : null}
    >
      {rows.length === 0 && <RowListEmpty>{emptyMessage}</RowListEmpty>}
      {rows.map((row, index) => <LinkedRowItem key={index} row={row} />)}
    </RowList>
  )
}

export function LinkedRowItem({ row }: { row: LinkedRow }) {
  const inner = (
    <>
      {row.icon !== undefined && (
        <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-[var(--surface-3)] text-muted-foreground">
          {row.icon}
        </div>
      )}
      <div className="min-w-0 flex-1 truncate">{row.name}</div>
      {row.meta !== undefined && (
        <div className="shrink-0 text-micro text-muted-foreground">{row.meta}</div>
      )}
      {row.actions && <div className="flex shrink-0 items-center gap-0.5">{row.actions}</div>}
    </>
  )
  const base = 'flex min-h-9 items-center gap-2 px-3 py-1.5 text-dense'

  if (row.href && !row.actions) {
    return <Link href={row.href} className={cn(base, 'transition-colors hover:bg-accent/40')}>{inner}</Link>
  }
  if (row.onClick && !row.actions) {
    return (
      <button type="button" onClick={row.onClick} className={cn(base, 'w-full text-left transition-colors hover:bg-accent/40')}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}

export type ActionRow = {
  icon?: React.ReactNode
  title: React.ReactNode
  detail?: React.ReactNode
  tone?: 'default' | 'primary' | 'warning' | 'danger'
  actions?: React.ReactNode
}

const ACTION_TONE_CHIP: Record<NonNullable<ActionRow['tone']>, string> = {
  default: 'bg-[var(--surface-3)] text-muted-foreground',
  primary: 'bg-[var(--primary-soft)] text-primary',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
}

export function ActionRowList({
  title,
  rows,
  className,
  collapsible,
  defaultOpen,
  variant,
  indentBody,
}: {
  title: React.ReactNode
  rows: ActionRow[]
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  variant?: RowListVariant
  /** Forwarded to the inner RowList (R-UX-025 flush in detail stacks). */
  indentBody?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <RowList className={className} title={title} collapsible={collapsible} defaultOpen={defaultOpen} variant={variant} indentBody={indentBody}>
      {rows.map((row, index) => (
        <div key={index} className="flex min-h-9 items-start gap-2 px-3 py-2 text-dense">
          {row.icon !== undefined && (
            <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', ACTION_TONE_CHIP[row.tone ?? 'default'])}>
              {row.icon}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-medium">{row.title}</div>
            {row.detail != null && <div className="mt-0.5 text-micro text-muted-foreground">{row.detail}</div>}
          </div>
          {row.actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{row.actions}</div>}
        </div>
      ))}
    </RowList>
  )
}

export type ActivityRow = {
  event: React.ReactNode
  actor?: React.ReactNode
  when: React.ReactNode
}

const ACTIVITY_COLS = 'grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_auto]'

export function ActivityRowList({
  title,
  rows,
  className,
  collapsible,
  defaultOpen,
  variant,
  indentBody,
  titleClassName,
  headerTextClassName,
  emptyTextClassName,
}: {
  title?: React.ReactNode
  rows: ActivityRow[]
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  variant?: RowListVariant
  /** Forwarded to the inner RowList (R-UX-025 flush in detail stacks). */
  indentBody?: boolean
  /** Override the section title's text-size utility (default `text-sm`).
   *  Passed through to RowList; every other ActivityRowList consumer keeps
   *  the default. */
  titleClassName?: string
  /** Override the EVENT/ACTOR/WHEN header row's text-size utility (default
   *  `text-micro`). Passed through to RowListHeader. */
  headerTextClassName?: string
  /** Override the "No recent activity" empty-state text-size utility
   *  (default `text-sm`). Passed through to RowListEmpty. */
  emptyTextClassName?: string
}) {
  return (
    <RowList
      className={className}
      title={title}
      titleClassName={titleClassName}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      variant={variant}
      indentBody={indentBody}
      header={(
        <RowListHeader className={ACTIVITY_COLS} textClassName={headerTextClassName}>
          <span>Event</span>
          <span>Actor</span>
          <span className="text-right">When</span>
        </RowListHeader>
      )}
    >
      {rows.length === 0 && <RowListEmpty textClassName={emptyTextClassName}>No recent activity.</RowListEmpty>}
      {rows.map((row, index) => (
        <div key={index} className={cn(ROW_GRID, ACTIVITY_COLS, 'h-9 text-dense')}>
          <span className="truncate">{row.event}</span>
          <span className="truncate text-muted-foreground">{row.actor}</span>
          <span className="whitespace-nowrap text-right text-micro text-muted-foreground tabular-nums">{row.when}</span>
        </div>
      ))}
    </RowList>
  )
}

export type MetricRow = {
  label: React.ReactNode
  value: React.ReactNode
  delta?: React.ReactNode
  deltaTone?: 'up' | 'down' | 'neutral'
}

const METRIC_DELTA_TONE: Record<NonNullable<MetricRow['deltaTone']>, string> = {
  up: 'text-[var(--color-success)]',
  down: 'text-[var(--color-danger)]',
  neutral: 'text-muted-foreground',
}

export function MetricRowList({
  title,
  rows,
  className,
  collapsible,
  defaultOpen,
  variant,
  indentBody,
}: {
  title: React.ReactNode
  rows: MetricRow[]
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  variant?: RowListVariant
  /** Forwarded to the inner RowList (R-UX-025 flush in detail stacks). */
  indentBody?: boolean
}) {
  return (
    <RowList className={className} title={title} collapsible={collapsible} defaultOpen={defaultOpen} variant={variant} indentBody={indentBody}>
      {rows.map((row, index) => (
        <div key={index} className="flex min-h-9 items-center justify-between gap-3 px-3 py-2 text-dense">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="flex items-baseline gap-1.5 text-right font-medium tabular-nums">
            {row.value}
            {row.delta != null && (
              <span className={cn('text-micro', METRIC_DELTA_TONE[row.deltaTone ?? 'neutral'])}>{row.delta}</span>
            )}
          </span>
        </div>
      ))}
    </RowList>
  )
}
