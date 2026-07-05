'use client'

import * as React from 'react'

// How much of the layout viewport the on-screen keyboard currently covers, in
// CSS pixels. Bottom-anchored slide-up sheets (CompactEditorPopover,
// DrawerShell's bottom presentation) raise their `bottom` by this amount so a
// focused field — or a combobox's own search input — never sits underneath the
// soft keyboard.
//
// Mechanic: the VisualViewport shrinks when the keyboard opens while the layout
// viewport (window.innerHeight) stays put, so the gap between them IS the
// keyboard height. On desktop the keyboard never opens, the gap stays ~0, and
// the listener is effectively inert (it still no-ops cheaply on resize).
//
// `active` lets a host skip the listener entirely when it isn't presenting a
// bottom sheet (e.g. the desktop popover branch) so we don't subscribe for
// nothing. SSR-safe: returns 0 until mounted.
export function useViewportKeyboardInset(active = true): number {
  const [inset, setInset] = React.useState(0)

  React.useEffect(() => {
    if (!active) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return

    const update = () => {
      // offsetTop accounts for the page being scrolled up under the keyboard.
      const covered = window.innerHeight - (vv.height + vv.offsetTop)
      // Ignore sub-pixel noise / the URL-bar collapse (a handful of px).
      setInset(covered > 24 ? Math.round(covered) : 0)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      // Reset in cleanup (not the effect body) so `active: false` — and
      // unmount — return the hook to 0 without a sync setState in the effect.
      setInset(0)
    }
  }, [active])

  return inset
}

// Inline style for a bottom-anchored slide-up sheet given the current keyboard
// inset. Does TWO things, both required:
//   1. `bottom: inset` rests the sheet's bottom edge on top of the keyboard so
//      its lower fields / action row aren't buried under it.
//   2. `maxHeight: 100dvh - inset` CLAMPS the sheet to the visible band so its
//      TOP (header + first fields) can never be pushed off the top of the
//      screen. Lifting `bottom` alone translated a max-height sheet upward until
//      its top scrolled past the screen edge — the reported "the input I'm
//      typing in gets pushed off screen" bug on tall forms. Clamping keeps the
//      whole sheet inside the visible band and lets the scrolling body, not the
//      viewport, move fields. (`100dvh` ≈ the full layout viewport here because
//      the app uses the default `interactive-widget=resizes-visual`, so the gap
//      to the visual viewport IS `inset`.) The `1rem` leaves a small top breath.
// Returns undefined when no keyboard is shown so the caller's own max-height
// class (e.g. `max-h-[88dvh]`) governs the closed state.
export function keyboardSheetStyle(inset: number): React.CSSProperties | undefined {
  if (!inset) return undefined
  return { bottom: inset, maxHeight: `calc(100dvh - ${inset}px - 1rem)` }
}
