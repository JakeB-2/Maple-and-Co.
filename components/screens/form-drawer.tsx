'use client'

import * as React from 'react'
import { useContext } from 'react'
import { Button } from '@/components/ui/button'
import { RouteHelpLink } from '@/components/ui/route-help-link'
import { XIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DrawerShell,
  DrawerCloseContext,
  DrawerPortalContext,
  DrawerHeaderBar,
  navOf,
  type DrawerSize,
  type DrawerMobilePresentation,
  type DrawerNavProps,
} from './detail-drawer'
import { FormDrawerGuardProvider } from './form-drawer-context'

// FormDrawer — the create/edit chrome preset over the shared DrawerShell.
//
// Same container as DetailDrawer (DrawerShell owns the Sheet, open-state
// contract, focus handling, and sizing); FormDrawer only differs in its chrome:
// a light header and a scrolling body that publishes DrawerPortalContext so
// form popovers (combobox/select/datepicker) portal inside the Sheet's focus
// trap. There is no sticky footer — the form owns its own submit/cancel row.
//
// Open state is URL-driven via two patterns:
//
//   "new" form:   <FormDrawer paramKey="new" paramValue={params.new === '1' ? '1' : null}>
//   "edit" form:  <FormDrawer paramKey="edit" paramValue={params.edit}>
//
// Or imperative:
//
//   <FormDrawer open={open} onOpenChange={setOpen} title="New item" …>
//
// Width: defaults to "md" (560px). Use "lg" only when the form has more
// than ~12 fields or a side rail of helper info.

export type FormDrawerSize = DrawerSize
export type FormDrawerMobilePresentation = DrawerMobilePresentation

type Props = {
  children: React.ReactNode
  /** Drawer header title — e.g. "New item" or "Edit record". Required
   *  when `withChrome` is true (the default). Ignored when withChrome is
   *  false — caller provides chrome via children (typically wrapped in
   *  `<FormDrawerChrome>`). */
  title?: React.ReactNode
  /** Optional eyebrow line above the title (e.g. parent context). */
  eyebrow?: React.ReactNode
  /** Optional subtitle below the title. */
  subtitle?: React.ReactNode
  mode?: 'edit' | 'create'
  /** Override the route-derived help article. Pass null to hide the icon. */
  helpArticleId?: string | null
  size?: FormDrawerSize
  /** Phone-only presentation. Defaults to bottom — the phone-native form shape
   *  with soft-keyboard handling (R-UX-030); pass 'side' only for a form that
   *  genuinely needs the full-height right sheet on phones. Desktop always
   *  remains right-side. */
  mobilePresentation?: FormDrawerMobilePresentation
  className?: string
  /** Default true; render the integrated header chrome around children.
   *  Pass false to render children directly — used when the drawer is
   *  mounted around a `<Suspense>` and both fallback + resolved content
   *  render their own chrome via `<FormDrawerChrome>`. */
  withChrome?: boolean
} & DrawerNavProps

export function FormDrawer(props: Props) {
  const withChrome = props.withChrome ?? true
  const open = 'paramKey' in props && props.paramKey != null ? !!props.paramValue : props.open
  const dirtyRef = React.useRef(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const reportDirty = React.useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  const beforeClose = React.useCallback(() => {
    if (!dirtyRef.current) return true
    setConfirmOpen(true)
    return false
  }, [])

  // Reset the dirty/confirm state whenever the drawer closes. Done in the
  // effect CLEANUP (runs on the open -> closed transition) rather than the
  // body to satisfy react-hooks/set-state-in-effect.
  React.useEffect(() => {
    if (!open) return
    return () => {
      dirtyRef.current = false
      setConfirmOpen(false)
    }
  }, [open])

  return (
    <DrawerShell
      {...navOf(props)}
      size={props.size}
      mobilePresentation={props.mobilePresentation}
      className={props.className}
      title={props.title ?? 'Form'}
      beforeClose={beforeClose}
    >
      <DrawerCloseBridge>
        {(close) => (
          <FormDrawerGuardProvider value={{
            reportDirty,
            requestClose: close,
          }}>
            {withChrome ? (
              <FormDrawerChrome
                title={props.title}
                eyebrow={props.eyebrow}
                subtitle={props.subtitle}
                mode={props.mode}
                helpArticleId={props.helpArticleId}
              >
                {props.children}
              </FormDrawerChrome>
            ) : (
              props.children
            )}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have unsaved changes on this form. If you close now they will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep editing</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      dirtyRef.current = false
                      setConfirmOpen(false)
                      close()
                    }}
                  >
                    Discard changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </FormDrawerGuardProvider>
        )}
      </DrawerCloseBridge>
    </DrawerShell>
  )
}

function DrawerCloseBridge({
  children,
}: {
  children: (close: () => void) => React.ReactNode
}) {
  const close = useContext(DrawerCloseContext) ?? (() => {})
  return <>{children(close)}</>
}

/**
 * Renders the standard form-drawer chrome (header + scrolling body, no
 * sticky footer — forms own their own submit row). When invoked inside a
 * `<FormDrawer>`, the X derives its close handler from context. Pass an
 * explicit `onClose` only when used outside a drawer.
 */
export function FormDrawerChrome({
  mode = 'edit',
  title,
  eyebrow,
  subtitle,
  onClose,
  hideClose = false,
  children,
  helpArticleId,
}: {
  mode?: 'edit' | 'create'
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  subtitle?: React.ReactNode
  onClose?: () => void
  /** Hide the top-right close (X). Closing is then via the overlay or the
   *  form's own save/cancel actions. */
  hideClose?: boolean
  children: React.ReactNode
  /** Override the route-derived help article. Pass null to hide the icon. */
  helpArticleId?: string | null
}) {
  const closeFromContext = useContext(DrawerCloseContext)
  const handleClose = onClose ?? closeFromContext ?? (() => {})
  // Publish the scrollable body node so popover-style children (combobox,
  // select) portal inside the Sheet's focus trap instead of <body>.
  const [bodyNode, setBodyNode] = React.useState<HTMLDivElement | null>(null)

  return (
    <div className="flex flex-col h-full min-h-0">
      <DrawerHeaderBar
        mode={mode}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <RouteHelpLink articleId={helpArticleId} />
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
      <div
        ref={setBodyNode}
        className="flex-1 min-h-0 overflow-y-auto px-6 py-5"
      >
        <DrawerPortalContext.Provider value={bodyNode}>
          {children}
        </DrawerPortalContext.Provider>
      </div>
    </div>
  )
}
