'use client'

/**
 * useActionSubmit collapses the repetitive create/edit form submit pattern:
 * warning / force / redirect / toast plumbing around a caller-supplied server
 * action. The action owns capability checks, schema validation, audit fields,
 * and cache invalidation at the server boundary; this hook is purely the
 * client-side submit lifecycle.
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { ActionResult, ActionWarning } from '@/lib/action-result'
import { useMutationRefresh } from '@/lib/hooks/use-mutation-refresh'
import { useDrawerNavHref } from '@/lib/hooks/use-drawer-nav'
import { nullifyEmpty } from '@/lib/utils'

export type RedirectSpec =
  | ((id: string) => string)
  | { mode: 'list'; listHref: string }

function resolveRedirect(spec: RedirectSpec, id: string): string {
  return typeof spec === 'function' ? spec(id) : spec.listHref
}

export type UseActionSubmitResult<T> = {
  submitError: string | null
  setSubmitError: (msg: string | null) => void
  submitWarnings: ActionWarning[]
  force: boolean
  setForce: (force: boolean) => void
  handleSubmit: (values: T) => Promise<void>
  isPending: boolean
}

/** Kept as an alias for callers written against the crud-submit surface. */
export type UseCrudSubmitResult<T> = UseActionSubmitResult<T>

function stablePayloadSignature(value: unknown): string {
  const seen = new WeakSet<object>()

  function normalize(input: unknown): unknown {
    if (input instanceof Date) return input.toISOString()
    if (Array.isArray(input)) return input.map(normalize)
    if (input && typeof input === 'object') {
      if (seen.has(input)) return '[Circular]'
      seen.add(input)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(input).sort()) {
        out[key] = normalize((input as Record<string, unknown>)[key])
      }
      return out
    }
    return input
  }

  return JSON.stringify(normalize(value))
}

// ---------------------------------------------------------------------------
// useActionSubmit — warning / force / redirect / toast plumbing where the
// write goes through a CALLER-SUPPLIED server action (returning
// ActionResult<T>). This is what backs the custom-submit CrudForm variant:
// bespoke multi-table actions reuse all of CrudForm's chrome (warnings panel,
// force re-submit, success toast, redirect) without re-implementing it.
//
// The action OWNS its own auth gate (it's a `'use server'` action); this
// hook is purely the client-side submit lifecycle. The action receives the
// transformed values plus `force` and must honour the ActionResult contract:
// warnings (no error) => the action did NOT commit; re-submit with force.
// ---------------------------------------------------------------------------

export type CrudActionResult = ActionResult<{ id: string } | Record<string, unknown> | null>

export type ActionSubmitInput<T> = {
  /** Bespoke server action. Receives the transformed values + `force` flag. */
  onSubmit: (values: Record<string, unknown>, force: boolean) => Promise<CrudActionResult>
  /** Optional reshape before the action runs. Defaults to `nullifyEmpty`. */
  transform?: (values: T) => Record<string, unknown>
  /**
   * Where to go after a successful, non-warning submit. A function receives the
   * created/updated row id (from `result.data.id` when present, else '') — pass
   * `{ mode: 'list', listHref }` to return to a list. Omit to stay put (e.g. a
   * drawer that closes itself via `onSuccess`).
   */
  redirect?: RedirectSpec
  /** Success-side hook (close a drawer, refresh a list) run before redirect. */
  onSuccess?: (result: CrudActionResult) => void
  /** Run when the action returns soft warnings. */
  onSoftWarning?: () => void
  /**
   * Success-toast copy override. A string replaces the default 'Saved'; pass
   * `null` to suppress the success toast entirely (for forms that intentionally
   * stay silent on success, e.g. a flow that redirects to the new record
   * without a toast). Omit for the default 'Saved'.
   */
  successMessage?: string | null
  errorPrefix?: string
}

export function useActionSubmit<T extends Record<string, unknown>>(
  options: ActionSubmitInput<T>,
): UseActionSubmitResult<T> {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitWarnings, setSubmitWarnings] = useState<ActionWarning[]>([])
  const [force, setForce] = useState(false)
  const [warningSignature, setWarningSignature] = useState<string | null>(null)
  const { pushAndRefresh, isPending } = useMutationRefresh()
  const layerHref = useDrawerNavHref()

  const handleSubmit = useCallback(
    async (values: T) => {
      setSubmitError(null)

      const shaped = options.transform ? options.transform(values) : nullifyEmpty(values)
      const signature = stablePayloadSignature(shaped)
      const warningsMatchPayload = submitWarnings.length > 0 && warningSignature === signature

      // Inputs changed since the warning was shown: drop the stale force/warnings
      // so the user re-reads the warning against the new payload.
      if (force && submitWarnings.length > 0 && !warningsMatchPayload) {
        setForce(false)
        toast.error('Inputs changed. Review the warnings again before continuing.')
        return
      }
      if (submitWarnings.length > 0 && !warningsMatchPayload) {
        setSubmitWarnings([])
        setWarningSignature(null)
        setForce(false)
      }

      const forceConfirmed = warningsMatchPayload && force
      const result = await options.onSubmit(shaped, forceConfirmed)

      if (result.warnings && result.warnings.length > 0 && !result.error) {
        setSubmitWarnings(result.warnings)
        setWarningSignature(signature)
        setForce(false)
        options.onSoftWarning?.()
        return
      }

      if (result.error) {
        setSubmitError(result.error)
        toast.error(`${options.errorPrefix ?? 'Could not save'}: ${result.error}`)
        return
      }

      setSubmitWarnings([])
      setWarningSignature(null)
      setForce(false)
      // `successMessage: null` opts out of the success toast (parity for forms
      // that intentionally stay silent on success).
      if (options.successMessage !== null) {
        toast.success(options.successMessage ?? 'Saved')
      }
      options.onSuccess?.(result)

      if (options.redirect) {
        const id =
          result.data && typeof result.data === 'object' && 'id' in result.data
            ? String((result.data as { id: unknown }).id)
            : ''
        pushAndRefresh(layerHref(resolveRedirect(options.redirect, id)))
      }
    },
    [force, options, pushAndRefresh, layerHref, submitWarnings, warningSignature],
  )

  return { submitError, setSubmitError, submitWarnings, force, setForce, handleSubmit, isPending }
}
