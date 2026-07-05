'use client'

import * as React from 'react'

// Input types that represent a typed text/number entry — the only ones worth
// auto-focusing. Checkboxes, radios, files, buttons, ranges, colors, and the
// hidden/submit/reset machinery are all skipped.
const FOCUSABLE_INPUT_TYPES = new Set([
  'text',
  'number',
  'email',
  'tel',
  'url',
  'search',
  'password',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

function isDisabled(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
    return el.disabled
  }
  return el.getAttribute('aria-disabled') === 'true'
}

function isReadOnly(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.readOnly
  return el.getAttribute('aria-readonly') === 'true'
}

function isRequired(el: HTMLElement): boolean {
  if (el.getAttribute('data-autofocus-required') === 'true') return true
  if (el.getAttribute('aria-required') === 'true') return true
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.required
  return false
}

function isFilled(el: HTMLElement): boolean {
  const explicit = el.getAttribute('data-autofocus-filled')
  if (explicit != null) return explicit === 'true'
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.trim() !== ''
  return false
}

function isNotesField(el: HTMLElement): boolean {
  const haystack = [
    el.getAttribute('name'),
    el.id,
    el.getAttribute('aria-label'),
    el.getAttribute('placeholder'),
    el.closest('label')?.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return /\bnotes?\b|_notes?\b|\bnotes?_/.test(haystack)
}

function isEligible(el: HTMLElement): boolean {
  if (isDisabled(el) || isReadOnly(el)) return false
  if (!isRequired(el) || isFilled(el)) return false
  if (isNotesField(el)) return false
  // getClientRects() is empty for display:none / detached / collapsed elements,
  // which covers "not actually visible" without a getComputedStyle round-trip.
  if (el.getClientRects().length === 0) return false
  if (el instanceof HTMLInputElement) {
    if (!FOCUSABLE_INPUT_TYPES.has(el.type)) return false
    // A combobox/autocomplete search input is a popup trigger, not a plain
    // entry field — leave those to forms that opt in explicitly (autoFocus on
    // the field) so we never silently pop a dropdown on open.
    if (el.getAttribute('role') === 'combobox') return false
    if (el.hasAttribute('aria-autocomplete')) return false
  }
  return true
}

/**
 * Focus the first eligible text/number entry field inside `root`, unless a field
 * inside `root` already holds focus. That second clause is the opt-out: a form
 * that wants a *specific* field focused sets `autoFocus` on it, the browser
 * focuses it on mount, and this yields rather than stealing focus elsewhere.
 */
export function focusFirstField(root: HTMLElement): void {
  const active = document.activeElement
  if (active && active !== document.body && root.contains(active)) return
  const fields = root.querySelectorAll<HTMLElement>(
    'input, textarea, button[data-autofocus-required="true"], [data-autofocus-required="true"][tabindex]',
  )
  for (const el of fields) {
    if (isEligible(el)) {
      el.focus({ preventScroll: true })
      return
    }
  }
}

/**
 * Auto-focus the first text/number field inside a form/drawer/popover subtree.
 *
 * Runs one animation frame after the effect commits so it lands *after* a
 * drawer/sheet's own open-focus management — Radix's FocusScope focuses the
 * content (or close button) on open in a layout effect; our later programmatic
 * focus wins and isn't trapped back, because FocusScope only auto-focuses once
 * on mount and traps Tab navigation, not arbitrary `.focus()` calls.
 *
 * Mobile keyboard note: the keyboard *layout* (numeric vs text) follows the
 * input's type/inputMode automatically. Whether the soft keyboard *opens* from
 * a programmatic focus is OS-dependent — Android opens it; iOS Safari only
 * opens it for focus triggered directly by a user tap, so on iOS the cursor
 * lands but the keyboard may stay closed until the field is tapped.
 *
 * @param ref    element whose subtree is searched for the first field
 * @param active re-run the focus whenever this transitions to true. Pass the
 *               drawer/popover `open` flag for surfaces that mount once and
 *               toggle; leave the default (true) for always-mounted page forms.
 */
export function useAutoFocusFirstField(
  ref: React.RefObject<HTMLElement | null>,
  active = true,
): void {
  React.useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    const raf = requestAnimationFrame(() => focusFirstField(root))
    return () => cancelAnimationFrame(raf)
  }, [ref, active])
}
