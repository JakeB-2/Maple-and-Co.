'use client'

import * as React from 'react'
import { createContext, useContext } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { RouteHelpLink } from '@/components/ui/route-help-link'
import { XIcon, ArrowUpRightIcon } from 'lucide-react'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useViewportKeyboardInset, keyboardSheetStyle } from '@/lib/hooks/use-viewport-keyboard-inset'
import { cn } from '@/lib/utils'

// Close handler is provided by the drawer container so chrome rendered as
// children (e.g. a skeleton fallback that needs to outlive a Suspense
// boundary) can wire its own X button without re-implementing param-stripping.
// Shared between DetailDrawer and FormDrawer so chrome components don't care
// which container they sit inside.
export const DrawerCloseContext = createContext<(() => void) | null>(null)

// Portal target for any popover-style child (combobox, select, datepicker)
// rendered inside a drawer. Without this, base-ui Combobox portals to <body>,
// which sits outside the Sheet's Radix Dialog focus trap — clicks on options
// then get eaten by the trap and never register a selection. Drawer chrome
// publishes its inner scroll container here so popups can portal into it.
export const DrawerPortalContext = createContext<HTMLElement | null>(null)

function useDrawerCloseFromContext(): () => void {
  const close = useContext(DrawerCloseContext)
  return close ?? (() => {})
}

// Pattern 1A primitive — Detail Drawer.
//
// Renders an `<EntityDetailContent />` inside a Sheet with an opinionated
// rich header, scrollable body, and sticky footer. Open state is driven by a
// query param (`?item=abc`); closing strips the param.
//
// Width spec (locked by design):
//   - `sm` 440px — confirmations + light edits
//   - `md` 560px — DEFAULT — most read-detail drawers
//   - `lg` 760px — two-column bodies (form + side rail)
//
// Header spec — "rich" variant (drawer-h-rich):
//   - Eyebrow: `{ID} · {STATUS}` 11px / 600 / uppercase / tracking-[.06em] muted
//   - Title:  18px / 600 / -0.2 letter-spacing
//   - Subtitle: 12.5px muted (date · duration · resource)
//   - Background: surface-2 (differentiates from body)
//   - Top-right: ghost icon-buttons (expand-to-route, close)
//
// Footer pattern: 1px top border, `card` bg, right-aligned. Danger ghost on
// far left (e.g. "Delete item") → spacer → outline → primary.
//
// Stacked drawers: when this drawer opens another, add `data-back` on the
// wrapper — the back drawer slides 32px left and dims; the front drawer
// renders a 28×28 "back" tab on its left edge.
//
// Two compositions:
//
//   <DetailDrawer paramKey="item" paramValue={params.item}>
//     <ItemDetailContent id={params.item} />
//   </DetailDrawer>
//
//   <DetailDrawer open={open} onOpenChange={setOpen} size="lg">…</DetailDrawer>
//
// House rule: every foreign-key click in the app should open a drawer like
// this rather than navigating, unless the entity is a Pattern 1C destination.

export type DrawerSize = 'sm' | 'md' | 'lg'
export type DrawerMobilePresentation = 'side' | 'bottom'
/** @deprecated alias retained for existing imports; use DrawerSize. */
export type DetailDrawerSize = DrawerSize

// Width tokens — `data-[side=right]:` prefix is required to beat shadcn
// Sheet's built-in `data-[side=right]:sm:max-w-sm` (384px) which would
// otherwise clamp the drawer regardless of our custom max-w.
const SIZE_CLASS: Record<DrawerSize, string> = {
  sm: 'data-[side=right]:sm:max-w-[var(--drawer-sm)]',
  md: 'data-[side=right]:sm:max-w-[var(--drawer-md)]',
  lg: 'data-[side=right]:sm:max-w-[var(--drawer-lg)]',
}

// Open-state contract shared by every drawer surface: URL-param-driven (open
// when paramValue is non-empty; closing strips the key) or imperative (open +
// onOpenChange). DrawerShell, DetailDrawer, and FormDrawer all speak this exact
// union so the open/close wiring lives in exactly one place.
export type DrawerNavProps =
  | {
      /** Query-param key (e.g. "item"). Drawer is open when paramValue is non-empty. */
      paramKey: string
      paramValue: string | null | undefined
      open?: never
      onOpenChange?: never
    }
  | {
      paramKey?: never
      paramValue?: never
      open: boolean
      onOpenChange: (open: boolean) => void
    }

type DrawerProps = {
  children: React.ReactNode
  /** Width tier. Default "md". */
  size?: DetailDrawerSize
  /** Tailwind override for the underlying SheetContent class. */
  className?: string
  /** Show the rich-header chrome around children. Default true. */
  withChrome?: boolean
  /** When provided with withChrome, renders the standard rich header. */
  header?: DrawerHeaderProps
  /** When provided with withChrome, renders the sticky footer. */
  footer?: React.ReactNode
  /** Set true when this drawer has a child drawer open above it. */
  isBack?: boolean
  /** Optional href that "expand to full route" navigates to. */
  expandHref?: string
  /** sr-only accessible name for the underlying Radix Dialog. Falls back to
   *  header.title (if set) or "Details". */
  title?: React.ReactNode
} & DrawerNavProps

export type DrawerHeaderProps = {
  mode?: 'detail' | 'edit' | 'create'
  /** Eyebrow line — typically `{ID} · {STATUS}`. */
  eyebrow?: React.ReactNode
  /** Title line — main label of the record. */
  title: React.ReactNode
  /** Subtitle — supplementary single line (date · resource). */
  subtitle?: React.ReactNode
  /** Optional icon-buttons rendered to the right of close. */
  extraActions?: React.ReactNode
  /** Override the route-derived help article. Pass null to hide the icon. */
  helpArticleId?: string | null
}

// DrawerShell — the one drawer container.
//
// Owns everything identical across read (DetailDrawer) and write (FormDrawer)
// surfaces: the right-side Sheet, the URL-param/imperative open contract, focus
// capture+restore for URL-driven drawers (which have no Radix trigger to
// restore to), the width tier, the stacked-drawer offset, the close-handler
// context, and the sr-only DialogTitle Radix requires. It renders its children
// raw — the caller supplies the chrome (DrawerChrome / FormDrawerChrome) or
// none. The named DetailDrawer / FormDrawer exports are chrome presets over it.
export function DrawerShell(
  props: {
    children: React.ReactNode
    /** Width tier. Default "md". */
    size?: DrawerSize
    /** Tailwind override for the underlying SheetContent class. */
    className?: string
    /** Set true when this drawer has a child drawer open above it. */
    isBack?: boolean
    /** sr-only accessible name for the underlying Radix Dialog. */
    title?: React.ReactNode
    /** Form drawers may opt into a bottom sheet below md; detail drawers stay side drawers. */
    mobilePresentation?: DrawerMobilePresentation
    /** Return false to keep the drawer open, e.g. while showing a discard dialog. */
    beforeClose?: () => boolean
  } & DrawerNavProps,
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isWide = useMediaQuery('(min-width: 768px)')
  // Captured on open (in onOpenAutoFocus, while activeElement is still the
  // opener), restored on close. Radix Sheet's normal "restore focus to
  // trigger" doesn't fire here because the drawer is URL-driven and has no
  // <Trigger> in the React tree — without this, keyboard users land on body.
  const openerRef = React.useRef<HTMLElement | null>(null)

  const isParamMode = 'paramKey' in props && props.paramKey != null
  const open = isParamMode
    ? !!props.paramValue
    : (props as { open: boolean }).open

  function performClose() {
    if (isParamMode) {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.delete(props.paramKey!)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    } else {
      ;(props as { onOpenChange: (open: boolean) => void }).onOpenChange(false)
    }
  }

  function requestClose() {
    if (props.beforeClose && !props.beforeClose()) return
    performClose()
  }

  function handleOpenChange(next: boolean) {
    if (next) return
    requestClose()
  }

  const size = props.size ?? 'md'
  const side = props.mobilePresentation === 'bottom' && !isWide ? 'bottom' : 'right'
  // Keep the bottom-sheet form clear of the soft keyboard: rest it on top of the
  // keyboard AND clamp its height to the visible band (see keyboardSheetStyle).
  const keyboardInset = useViewportKeyboardInset(open && side === 'bottom')
  const insetRef = React.useRef(0)
  const focusedFieldRef = React.useRef<HTMLElement | null>(null)

  // Pull the focused field into the visible band. The keyboard-open transition
  // (the field that summoned the keyboard) is handled by the effect below; this
  // listener handles moving BETWEEN fields while the keyboard is already up — the
  // browser's native scroll-into-view is unreliable inside a fixed sheet. We
  // listen on `document` (focusin bubbles) to avoid colliding with Radix's own
  // focus handling on SheetContent; only one bottom sheet is open at a time.
  React.useEffect(() => {
    if (side !== 'bottom' || !open) return
    function onFocusIn(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.matches('input, textarea, select, [contenteditable="true"]')) return
      focusedFieldRef.current = target
      if (insetRef.current) target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [side, open])

  React.useEffect(() => {
    insetRef.current = keyboardInset
    if (keyboardInset && focusedFieldRef.current) {
      focusedFieldRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [keyboardInset])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        style={keyboardSheetStyle(keyboardInset)}
        data-back={props.isBack ? 'true' : undefined}
        onOpenAutoFocus={() => {
          // Capture before Radix moves focus into the dialog. document.activeElement
          // is still the opener at this point.
          const el = document.activeElement
          openerRef.current = el instanceof HTMLElement ? el : null
        }}
        onCloseAutoFocus={(event) => {
          // Bypass Radix's default restore (which falls back to <body> since
          // there's no managed trigger) and refocus the captured opener if
          // it's still in the DOM. Skip if the opener was removed (e.g. a
          // soft-delete redirect detached the row).
          const opener = openerRef.current
          openerRef.current = null
          if (opener && document.contains(opener)) {
            event.preventDefault()
            opener.focus({ preventScroll: false })
          }
        }}
        className={cn(
          'w-full overflow-hidden p-0 flex flex-col gap-0 transition-[transform,filter,box-shadow] duration-200',
          SIZE_CLASS[size],
          props.mobilePresentation === 'bottom' &&
            'data-[side=bottom]:max-h-[88dvh] data-[side=bottom]:rounded-t-xl',
          props.isBack &&
            'data-[back=true]:-translate-x-8 data-[back=true]:brightness-[0.97]',
          props.className,
        )}
      >
        <DrawerCloseContext.Provider value={requestClose}>
          {/* Radix requires a DialogTitle on every Dialog/Sheet for screen
              readers. The visible h2 lives in the chrome, so we mirror the
              title here as sr-only. */}
          <SheetTitle className="sr-only">{props.title ?? 'Details'}</SheetTitle>
          <SheetDescription className="sr-only">
            Drawer panel for the selected workspace action.
          </SheetDescription>
          {props.children}
        </DrawerCloseContext.Provider>
      </SheetContent>
    </Sheet>
  )
}

// Narrow the drawer props down to just the open-state discriminant so it can
// be forwarded to DrawerShell without TypeScript losing the union.
export function navOf(props: DrawerNavProps): DrawerNavProps {
  return 'paramKey' in props && props.paramKey != null
    ? { paramKey: props.paramKey, paramValue: props.paramValue }
    : {
        open: (props as { open: boolean }).open,
        onOpenChange: (props as { onOpenChange: (open: boolean) => void }).onOpenChange,
      }
}

export function DetailDrawer(props: DrawerProps) {
  const withChrome = props.withChrome ?? true

  return (
    <DrawerShell
      {...navOf(props)}
      size={props.size}
      className={props.className}
      isBack={props.isBack}
      title={props.title ?? props.header?.title ?? 'Details'}
    >
      {withChrome ? (
        <DrawerChrome
          header={props.header}
          footer={props.footer}
          expandHref={props.expandHref}
        >
          {props.children}
        </DrawerChrome>
      ) : (
        props.children
      )}
    </DrawerShell>
  )
}

/**
 * Renders the standard drawer chrome (header / scrolling body / sticky
 * footer). When invoked inside a `<DetailDrawer>`, the X button derives its
 * close handler from context — pass an explicit `onClose` only when using
 * the chrome outside of a drawer (e.g. as a Suspense fallback that doesn't
 * re-mount the underlying Sheet).
 */
/**
 * Shared drawer header bar — the eyebrow / title / subtitle block on the left
 * and a right-aligned action cluster. Used by both the read-only `DrawerChrome`
 * and the create/edit `FormDrawerChrome` so detail and form drawers render an
 * identical header (only the text and the action buttons differ).
 */
export function DrawerHeaderBar({
  mode = 'detail',
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  mode?: 'detail' | 'edit' | 'create'
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-aligned icon-button cluster (help / extra actions / close). */
  actions?: React.ReactNode
}) {
  return (
    <div
      data-mode={mode}
      className="shrink-0 border-b bg-card px-5 py-0"
    >
      {/* 3-column grid: empty spacer | centered title block | right-pinned
          actions. The two outer columns are equal (1fr) so the title is
          centered against the panel, not merely against the leftover space;
          the title column is minmax(0,auto) so it can shrink and truncate. */}
      <div className="grid min-h-[60px] grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2">
        <div aria-hidden className="min-w-0" />
        <div className="flex min-w-0 flex-col items-center text-center">
          {eyebrow != null && (
            <div className="text-micro font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1.5">
              {eyebrow}
            </div>
          )}
          {title != null && (
            <h2 className="w-full truncate text-[1rem] font-semibold capitalize leading-tight">
              {title}
            </h2>
          )}
          {subtitle != null && (
            <div className="mt-1 w-full text-dense text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 justify-self-end">{actions}</div>
      </div>
    </div>
  )
}

export function DrawerChrome({
  header,
  footer,
  expandHref,
  onClose,
  hideClose = false,
  children,
}: {
  header?: DrawerHeaderProps
  footer?: React.ReactNode
  expandHref?: string
  onClose?: () => void
  /** Hide the top-right close (X). Closing is then via the overlay or the
   *  surface's own actions (e.g. a form's save/cancel). */
  hideClose?: boolean
  children: React.ReactNode
}) {
  const closeFromContext = useDrawerCloseFromContext()
  const handleClose = onClose ?? closeFromContext
  return (
    <div className="flex flex-col h-full min-h-0">
      {header && (
        <DrawerHeaderBar
          mode={header.mode}
          eyebrow={header.eyebrow}
          title={header.title}
          subtitle={header.subtitle}
          actions={
            <>
              <RouteHelpLink articleId={header.helpArticleId} />
              {header.extraActions}
              {expandHref && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open full page"
                >
                  <a href={expandHref}>
                    <ArrowUpRightIcon className="size-4" />
                  </a>
                </Button>
              )}
              {!hideClose && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </>
          }
        />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2.5 pb-5">{children}</div>
      {footer && (
        <div className="shrink-0 border-t bg-card px-5 py-3 flex gap-2 justify-end items-center">
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * Helper: compose a footer with a danger-ghost left action and an n-button
 * right cluster (outline/primary). Pure layout sugar — pass any <Button/>s.
 */
export function DetailDrawerFooter({
  destructive,
  children,
}: {
  destructive?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <>
      {destructive}
      <div className="flex-1" />
      {children}
    </>
  )
}
