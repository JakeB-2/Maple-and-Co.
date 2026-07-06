# Maple & Co — Design Brief (v1)

> Live shareable version: https://claude.ai/code/artifact/3630828e-ac43-471b-a551-dd7d0a988f87
> The build ships on plain placeholder styling; the visual pass (milestone M5) applies this brief's deliverables.

## The one-pager

A private household companion for exactly three residents: **Jake, Kayla, and Maple the dog**.
Four things, done warmly:

- **Shared spending** — a diary, not a ledger. No budgets, no "you owe".
- **Groceries** — build the list at home, shop it aisle by aisle.
- **Maple's life** — walks, meals, meds, weight; who did what, when.
- **Calendar + recurring chores** — that fade politely instead of nagging.

It's an installed PWA on two phones. Nobody else will ever use it. That privacy is a budget:
no ads, no paywalls, no upsells, no onboarding — **spend all of that saved attention on personality.**

The one hard product rule: **any log is ≤ 2 taps from opening the app**, with smart defaults
(payer = whoever's phone it is, date = today, store = last used). Capture speed beats feature depth.

Mood words: playful · warm · anti-enterprise · thumb-first · built for two (+ dog).

## Navigation

Five tabs: **Today / Spend / Groceries / Maple / Calendar**, plus a floating paw FAB for
quick-capture from anywhere. Today is the shared morning-coffee digest (Cozi-style).

## Screens inventory

| Screen | What it is |
| --- | --- |
| **Today** | Digest: today's occurrences, fading tasks, partner's recent spends, new grocery adds, Maple status chips ("walked just now"). |
| **Spending list + entry sheet** | Month-grouped, per-category per-currency totals (MXN/USD side by side, never converted). Who-paid = signature colors. Emoji reactions (Honeydue framing: shared diary, NOT Splitwise debt ledger). |
| **Groceries need list** | Bring!-style one-tap tiles from learned catalog + recently-used rail. |
| **Shopping mode** | One store, sections in real aisle-walk order, huge check-offs (one hand on the cart), quick price on check-off, running total footer in store currency (AnyList's under-copied feature). |
| **Maple profile** | Character page first (photo, age, quirks); medical ledger one tap deeper (weight sparkline, next-dose countdown, recency chips). Warm 11pets, never clinical. |
| **Maple quick-log + feed** | FAB → 5–7 big type tiles → done (Huckleberry 2-tap). Shared feed: "Kayla fed Maple 20 min ago" — the coordination layer IS the killer feature. |
| **Calendar + tasks** | Month grid + agenda; recurrence sentence-builder ("Every 2 weeks on Tue", Todoist-style); toggle "on a schedule" vs "after last done". Tasks = Tody-style freshness board, gently desaturating. **Never guilt-red.** "Skip today" is first-class. |
| **Settings** | Profiles/colors, categories, stores + sections, Maple's event types. Quiet utility. |

## Component needs

- **Bottom sheets** (all create/edit, URL-driven, keyboard-aware) and **big-tap rows**.
- **Avatar chips** — one signature color per person + a third for Maple/household. Colors carry "who" app-wide; must survive both themes.
- **Recency chips** ("walked 2h ago") and **freshness rings/bars** — gradual decay, no cliff-edge reset-to-zero (the Loop lesson).
- **Sparklines** (weight), **photo attach**, **FAB**.
- **Empty states with personality** — every empty list is a Maple illustration moment; all-done = sleeping-Maple reward screen. Humor never in error states.
- **Celebration scaled to rarity** — check-morph + haptic daily; small character moment weekly; paw-print confetti only for rare milestones. Anti-confetti rule: if everything celebrates, nothing does.

## Maple, the mascot

Illustrated Maple with four emotional states: **normal, happy wiggle, zoomies, sleeping**.
Finch's compassion stance: never sad/sick/neglected-looking as a motivator — she's a real dog.
No points, no XP, no leaderboards, no streak-shame.

## Visual direction

Warm, rounded, cozy. Dopamine-adjacent warmth (corals, ambers, warm greens, creams) tempered by
restraint: one saturated accent per person, quiet grounds. Hand-drawn iconography (Bring!
benchmark). Tactile micro-animations < 300ms + haptics. Light and dark both first-class.
Thumb-first ergonomics; type readable at arm's length in a grocery aisle.

**Take from:** Bring! (tiles, slide-on, hand-drawn icons) · AnyList (aisle order, running total) ·
Tody (freshness decay) · Honeydue (couple-money warmth, reactions) · Cupla (built-for-two) ·
Finch (compassion) · Duolingo (milestone craft) · Huckleberry (2-tap grid) · DogLog/Rover
(shared pet feed, walk report card).

**Avoid:** points economies · debt framing · streak resets · confetti-everything · feature bloat
(FamilyWall) · clinical density (11pets) · guilt-red overdue states · enterprise chrome.

## Deliverables (each has a prepared slot in the code)

1. **Palette as OKLCH design tokens** — light + dark: ground, surfaces, ink, household accent, three signature colors. Drops into the `globals.css` token skeleton (Tailwind v4).
2. **Type scale** — display/body/label roles, sizes, weights. System or self-hosted faces only.
3. **Radius + shadow mood.**
4. **Component visual language** — chips, sheets, cards, check-offs, tab bar, FAB on the shadcn base.
5. **Maple illustration direction** + the four states. Includes PWA icon + splash.
6. **2–3 key screen concepts** — Today, shopping mode, Maple profile.
7. **Empty-state + celebration guidelines** — which moments get which scale of delight.

**Constraints:** Tailwind v4 token format · shadcn component base · bottom-sheet mobile patterns ·
≥ 44px touch targets · light + dark · installable PWA.

> **Tap targets — interim vs target.** ≥ 44px is the M5 *target* the visual pass ships. Until
> then the pre-M5 build floors dense icon controls at 36px on purpose (the `touch:` variant in
> `globals.css`, R-UX-022) rather than re-tokenizing density twice. So a 36px control today is
> the documented interim, not a regression against this line; the bump to 44px lands with the
> M5 component visual language (Deliverable 4), not before.
