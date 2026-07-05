'use client'

// Form layout primitives: AppForm, FormScreen, FormHeader, FormSection,
// FormActions, FieldWrapper. Plus the unsaved-changes guard used by Cancel
// and Back buttons. Split out from form.tsx so pages that only need the shell
// (or the cheaper text-field variants) don't drag in the date-picker /
// Combobox bundles.

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  useForm,
  FormProvider,
  useFormContext,
  type FieldValues,
  type DefaultValues,
  type SubmitHandler,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type input as ZodInput, type output as ZodOutput, type ZodType } from 'zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RouteHelpLink } from '@/components/ui/route-help-link'
import { useRegisterLiveRefreshBlock } from '@/lib/live-refresh-context'
import { useAutoFocusFirstField } from '@/lib/hooks/use-autofocus-first-field'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { useReportFormDrawerDirty } from './form-drawer-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { RowList } from './row-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// FormScreen — full page wrapper
// ---------------------------------------------------------------------------
export function FormScreen({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl space-y-6">{children}</div>
}

// ---------------------------------------------------------------------------
// FormHeader — mirrors DetailHeader
//
// The Back button respects the unsaved-changes guard for the surrounding form
// (when one is present). It uses the same dialog flow as FormActions Cancel,
// so accidentally clicking Back doesn't silently throw away input.
// ---------------------------------------------------------------------------
export function FormHeader({
  backHref,
  backLabel = 'Back',
  title,
  subtitle,
  helpArticleId,
}: {
  backHref: string
  backLabel?: string
  title: string
  subtitle?: string
  /** Override the route-derived help article. Pass null to hide the icon. */
  helpArticleId?: string | null
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-medium">{title}</h1>
          <RouteHelpLink articleId={helpArticleId} />
        </div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <NavGuardButton href={backHref} variant="outline">
        {backLabel}
      </NavGuardButton>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NavGuardButton — internal helper used by FormHeader/FormActions.
//
// Behaves like a Next Link, but when wrapped in a react-hook-form context
// it intercepts clicks while the form is dirty and asks the user to confirm
// discarding their changes. Outside a form context it falls back to a plain
// router.push (no guard), so it is safe to use anywhere.
// ---------------------------------------------------------------------------
function NavGuardButton({
  href,
  children,
  variant = 'outline',
}: {
  href: string
  children: React.ReactNode
  variant?: 'outline' | 'default'
}) {
  const router = useRouter()
  // useFormContext returns null when there is no surrounding FormProvider —
  // this lets the same component work inside and outside an AppForm.
  const ctx = useFormContext()
  const isDirty = !!ctx?.formState.isDirty
  const isSubmitting = !!ctx?.formState.isSubmitting

  const [confirmOpen, setConfirmOpen] = React.useState(false)

  function handleClick(e: React.MouseEvent) {
    if (isDirty && !isSubmitting) {
      e.preventDefault()
      setConfirmOpen(true)
    }
  }

  function discardAndLeave() {
    setConfirmOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button variant={variant} size="sm" asChild>
        {/* Use a real anchor so middle-click / open-in-new-tab still work
            when the form isn't dirty. */}
        <a href={href} onClick={handleClick}>
          {children}
        </a>
      </Button>
      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDiscard={discardAndLeave}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// UnsavedChangesDialog — shared confirm dialog used by NavGuardButton and
// FormActions Cancel. Centralising it keeps the wording consistent.
// ---------------------------------------------------------------------------
function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>
            You have unsaved changes on this form. If you leave now they will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button variant="destructive" size="sm" onClick={onDiscard}>
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// FormSection — card with optional title, two-column grid
// ---------------------------------------------------------------------------
export function FormSection({
  title,
  titleAccessory,
  collapsedOnMobile = false,
  children,
}: {
  title?: string
  /** Optional node rendered inline after the title (e.g. a <HelpHint />). */
  titleAccessory?: React.ReactNode
  /** Phone-only progressive disclosure (below the 768px reflow breakpoint): the
   *  section renders collapsible and starts collapsed, so non-essential fields
   *  don't push the essential ones — or the field being typed in — off-screen in
   *  the bottom-sheet form once the soft keyboard shrinks the viewport. Desktop
   *  (md+) is unchanged: always expanded, no chevron. Only meaningful with a
   *  `title` (the title row hosts the collapse toggle). */
  collapsedOnMobile?: boolean
  children: React.ReactNode
}) {
  // Width axis only (mirrors the drawer's own 768px side/bottom split) — the
  // collapse is a small-viewport space-saver, not a touch-ergonomics change, so
  // it keys off width, not pointer type. The drawer body only mounts after the
  // user opens it (post-hydration), so the media query is resolved by first
  // paint and there's no collapsed→expanded flash on desktop.
  const isWide = useMediaQuery('(min-width: 768px)')
  const collapseHere = collapsedOnMobile && !isWide

  // Form grammar: a flush (boxless) titled section with the accent-pill
  // header instead of a separate bordered card per group. Forms read as one
  // stack of section-stack headers rather than a column of cards.
  return (
    <RowList
      title={title}
      titleAction={titleAccessory}
      variant="plain"
      indentBody={false}
      collapsible={collapseHere}
      defaultOpen={!collapseHere}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-3 py-3 md:grid-cols-2">
        {children}
      </div>
    </RowList>
  )
}

// ---------------------------------------------------------------------------
// FormActions — submit + cancel row
//
// The Cancel button is unsaved-changes-aware: if the form is dirty (any field
// has been touched) clicking Cancel opens a confirmation dialog instead of
// silently discarding the user's input. Trained users can still leave by
// confirming "Discard changes".
// ---------------------------------------------------------------------------
export function FormActions({
  cancelHref,
  onCancel,
  submitLabel = 'Save Changes',
  error,
  onCreateAnother,
  onSubmit,
}: {
  /** Navigation target for Cancel. Use onCancel instead when inside a Dialog. */
  cancelHref?: string
  /** Callback for Cancel — use this inside Dialogs so the button closes the dialog. */
  onCancel?: () => void
  submitLabel?: string
  /** Server/submit error to display above the action buttons. */
  error?: string | null
  /**
   * When provided, adds a dropdown chevron next to the submit button with a
   * "Save and add another" option. Set your ref/flag before calling the form
   * submit so the submit handler knows the user's intent.
   */
  onCreateAnother?: () => void
  /**
   * When using the split-button (onCreateAnother), pass the form's submit
   * handler here so "Save and add another" can trigger a form submission.
   */
  onSubmit?: (values: never) => Promise<void>
}) {
  const router = useRouter()
  const layerHref = useDrawerNavHref()
  const { formState: { isSubmitting, isDirty }, handleSubmit: rhfHandleSubmit } = useFormContext()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const errorRef = React.useRef<HTMLParagraphElement | null>(null)
  const lastErrorRef = React.useRef<string | null | undefined>(error)

  // When a fail() result lands, the inline message often renders below the
  // scroll fold on long forms — the spinner clears, the submit re-enables,
  // and the user sees no visible change. Toast + scroll-into-view is the
  // only thing that reliably reaches the user.
  React.useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      toast.error(error)
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    lastErrorRef.current = error
  }, [error])

  function attemptCancel() {
    if (isDirty && !isSubmitting) {
      setConfirmOpen(true)
      return
    }
    performCancel()
  }

  function performCancel() {
    setConfirmOpen(false)
    if (onCancel) {
      onCancel()
      return
    }
    // Cancel a same-route drawer without wiping the list's sort/filter/search/page.
    if (cancelHref) router.push(layerHref(cancelHref))
  }

  function handleCreateAnother() {
    if (onCreateAnother) onCreateAnother()
    if (onSubmit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rhfHandleSubmit(onSubmit as any)()
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p ref={errorRef} role="alert" aria-live="assertive" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        {(onCancel || cancelHref) && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={attemptCancel}
            // App-wide action convention (R-UX-023): Cancel pinned bottom-LEFT,
            // submit bottom-RIGHT — fixed, learnable positions so an
            // accidentally-opened form always has a predictable exit. `mr-auto`
            // pushes Cancel to the far left; the row's `justify-end` keeps submit
            // far right (and still right-aligns submit when there's no Cancel).
            className="h-10 w-full text-sm md:mr-auto md:h-7 touch:h-9 md:w-auto md:text-xs"
          >
            Cancel
          </Button>
        )}
        {onCreateAnother ? (
          <div className="flex w-full md:w-auto">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-10 flex-1 rounded-r-none text-sm md:h-7 touch:h-9 md:flex-none md:text-xs"
            >
              {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-10 rounded-l-none border-l px-3 md:h-7 touch:h-9 md:px-2"
                >
                  <ChevronDown className="size-3.5" />
                  <span className="sr-only">More save options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleCreateAnother}>
                  Save and add another
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-10 w-full text-sm md:h-7 touch:h-9 md:w-auto md:text-xs"
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        )}
      </div>
      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDiscard={performCancel}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// FieldWrapper — shared by every field primitive (text/select/date/file/etc.)
// ---------------------------------------------------------------------------
type FieldWrapperProps = {
  label?: string  // omit when the section title already makes it obvious (e.g. a "Notes" section with one textarea)
  labelAccessory?: React.ReactNode
  error?: string
  required?: boolean
  span?: 'full'
  /** The id of the wrapped input. Connects the label to the input for screen
   *  readers and click-to-focus. Field primitives pass the form-field name. */
  htmlFor?: string
  children: React.ReactNode
}

export function FieldWrapper({ label, labelAccessory, error, required, span, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className={span === 'full' ? 'md:col-span-2' : undefined}>
      {label && (
        <Label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm">
          {label}
          {required && <span className="text-destructive">*</span>}
          {labelAccessory}
        </Label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppForm — root provider; wraps everything, owns the form state
//
// Keyboard: ⌘S / Ctrl+S submits the form (and pre-empts the browser's
// default save-page dialog). Esc on Sheets/Dialogs is handled by Radix.
// ---------------------------------------------------------------------------
export function AppForm<TSchema extends ZodType<FieldValues, FieldValues>>({
  schema,
  defaultValues,
  onSubmit,
  children,
  autoFocusFirstField = false,
}: {
  schema: TSchema
  defaultValues: DefaultValues<ZodInput<TSchema>>
  onSubmit: SubmitHandler<ZodOutput<TSchema>>
  children: React.ReactNode
  /** Focus the first empty required field on mount. Opt in only for screens or
   *  drawers whose explicit purpose is this form; embedded panes stay quiet. */
  autoFocusFirstField?: boolean
}) {
  const methods = useForm<ZodInput<TSchema>, unknown, ZodOutput<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  })

  const formRef = React.useRef<HTMLFormElement>(null)
  const submit = methods.handleSubmit(onSubmit)
  useRegisterLiveRefreshBlock(methods.formState.isDirty || methods.formState.isSubmitting)
  useReportFormDrawerDirty(methods.formState.isDirty)
  useAutoFocusFirstField(formRef, autoFocusFirstField)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd+S anywhere inside the form's subtree submits. We capture
      // even when focus is in a textarea — the only thing we'd be overriding
      // is the browser save-page dialog, which is never useful in-app.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        const formEl = formRef.current
        if (!formEl) return
        const target = e.target as Node | null
        if (!target || !formEl.contains(target)) return
        e.preventDefault()
        if (!methods.formState.isSubmitting) submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [methods, submit])

  // Shift+Enter must never submit (or behave as plain Enter). Swallow it in the
  // capture phase before any field/native-form handler sees it, except inside a
  // textarea where Shift+Enter is a legitimate newline. Plain Enter and ⌘/Ctrl+S
  // are untouched.
  function onKeyDownCapture(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && e.shiftKey) {
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'TEXTAREA') return
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <FormProvider {...methods}>
      <form ref={formRef} onSubmit={submit} onKeyDownCapture={onKeyDownCapture} noValidate>
        {children}
      </form>
    </FormProvider>
  )
}

// ---------------------------------------------------------------------------
// Re-export hook so pages can read isSubmitting without importing react-hook-form
// ---------------------------------------------------------------------------
export { useFormContext }
