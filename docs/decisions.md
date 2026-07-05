# Decision records — Maple & Co

Short entries, newest at the bottom. Each records a decision that isn't obvious from the code,
and the *why*, so future-us doesn't re-litigate it.

## D-001 · v1 scope = all four features
Spending → Groceries → Maple → Calendar+tasks, in that order. Each milestone ends
phone-verifiable on the installed PWA before the next starts.

## D-002 · AI capture deferred — seam only
No AI features in v1. The seam ships early so it's cheap later: private `captures` storage
bucket, a generic `capture_jobs` queue table (receipt/voice/photo/text kinds), and parse code
that self-disables when the AI env key is absent. Receipt review UI, voice capture etc. come
post-v1.

## D-003 · Design runs parallel; plain shadcn until M5
The design brief (docs/DESIGN-BRIEF.md) was handed off before M0. Implementation ships on
un-themed shadcn; the Jake+Kayla style guide lands in the OKLCH token skeleton as the M5 visual
pass. Why: unblocks build immediately, and the token skeleton makes the visual pass a paste, not
a refactor.

## D-004 · Supabase: reuse linked project `nvuudbhwnbrkitiotjgn`
PG 17.6, clean. Already linked; keys in `.env.local` (gitignored). Two auth users only,
created administratively — there is no public signup page.

## D-005 · Push notifications are post-v1
v1 is an installable PWA (manifest + icons, no service worker). Web Push (VAPID) + service
worker + Vercel-cron reminders come after v1. Why: SW caching bugs are the classic way to ship a
broken app to your own household; notifications aren't needed for the core loops.

## D-006 · Spending = log + categories + who. No budgets.
A shared diary, not a control system. `spent_by_user_id` is the actor-of-record and is distinct
from `created_by` (Jake can log Kayla's cash spend).

## D-007 · Calendar is self-contained
No Google/external calendar sync in v1 (or planned). The household calendar is for household
rhythm, not work meetings.

## D-008 · Timezone `America/Cancun`; currency mixed MXN/USD, no FX ever
Fixed UTC-5, no DST — date math is simple and stays simple. Money: `currency` column on spends
and stores ('MXN'|'USD'); every total is grouped per currency and shown side by side. We never
convert — any FX rate would be wrong and the household doesn't think in converted totals.

## D-009 · cacheComponents stays OFF for v1
Classic Next caching model: `export const dynamic = 'force-dynamic'` on authed pages +
`loading.tsx` skeletons + `revalidatePath`/`refresh()`. Why: supabase-js reads aren't
fetch-cache-tagged, the app is two users (no scale pressure), and the cacheComponents model is
still moving. Revisit post-v1.

## D-010 · Auth: proxy.ts is optimistic-only; requireAuth() everywhere
`proxy.ts` (Next 16's middleware replacement) only refreshes the Supabase session cookie and
optimistically redirects logged-out users to /login. The real trust boundary is
`lib/auth/dal.ts#requireAuth()` called in **every page and every server action** (actions are
public POST endpoints). No layout-gated auth — layouts don't re-render on client nav
(documented Next anti-pattern; deliberately NOT copying Portal's layout gate).

## D-011 · RLS is permissive by design
Both users may read/write everything — it's a two-person household. RLS exists so the anon key
alone can't touch data; authorization nuance would be theater.

## D-012 · Soft delete everywhere + 15s undo toast
`deleted_at`/`deleted_by_user_id` + partial indexes on all user-content tables; hard delete
never exposed in UI. Undo = clear the tombstone. Comments are polymorphic over 5 entity tables;
orphaning is neutralized because every parent soft-deletes.

## D-013 · Pet events are EAV with `system_key` anchors
Event types/attributes/values adapted from Portal's form engine (types ≈ form_defs, attributes ≈
form_questions, events ≈ form_submissions, values ≈ form_answers). Analytics (weight sparkline,
feed recency) query stable `system_key`s ('feed', 'walk', 'weight_kg', …) — never user-editable
names. Renames re-label history by design (household wants that; snapshot columns were
waiver-legal machinery and were dropped).

## D-014 · Grocery price is deliberately denormalized
Price lives on the list entry (hot path: running total during a trip) AND in append-only
`grocery_item_prices` history (analytics, future receipt feed). One server action writes both
atomically. UNIQUE-lower on catalog item names; "recently used" is derived from entries, not
denormalized.

## D-015 · Recurrence: embedded columns, date-only engine, two semantics
No rules table — the shared thing between events and tasks is a TS type + zod schema over
embedded columns. Engine (`lib/recurrence/`) is pure and date-only on 'YYYY-MM-DD' in household
TZ; time-of-day is presentation. `fixed` = grid anchored at anchor date (independent of
completion); `after_done` = last completion + interval (never expanded; exactly one projected
due date). Tests land before any calendar UI.

## D-016 · Recurrence exceptions: exclusions + standalone only
"Delete this occurrence" = exclusion row. "Edit this occurrence" = exclusion + standalone event.
**No edit-this-and-future in v1** — series-split is a manual operation. Why: this covers the
household's real cases; edit-this-and-future is the single largest complexity cliff in calendar
software.

## D-017 · Task completions are append-only; freshness never shames
`task_completions` is a log (undo = soft-delete the completion). Freshness ratio =
elapsed/period clamped 0–1.5, stages fresh/aging/due at 0.75/1.0; UI fades saturation and
**never turns red**. Tasks can link a pet event type — completing "Flea meds" auto-logs a Meds
pet event so Maple's countdown is truthful.

## D-018 · Storage: private buckets + authed `/media/[...path]` proxy
Buckets `media` (curated) and `captures` (raw inbox) are private. Images render via an authed
route handler that streams from storage with private caching, using plain `<img>`. Two users —
signed-URL churn and next/image optimization aren't worth it. `images.remotePatterns` stays
configured for the supabase host in case next/image is used later.

## D-019 · Audit triggers copied from Portal, hardened
Two trigger functions (created/updated fill) copied from Portal's baseline but with
`SET search_path = ''` added (Portal omits it). Actor columns are stamped app-side via
`lib/audit.ts`. Triggers are ENABLE ALWAYS on every table.

## D-020 · Reactions are hard-delete
`reactions` is a created-only toggle (UNIQUE per user+emoji+entity). Removing a reaction deletes
the row — a reaction is not content worth tombstoning.

## D-021 · Check-off is a Postgres function, and uncheck retracts its price rows
D-014's "one action writes both atomically" is literal: supabase-js has no transactions, so
`fn_check_off_grocery_entry` / `fn_uncheck_grocery_entry` do the entry-stamp + price-history pair
in one transaction (SECURITY INVOKER — RLS still applies; NULL return = lost the two-phone race).
Uncheck DELETEs the entry's `source='checkoff'` observations: a retracted check-off was a mis-tap,
not a price fact, so removing it keeps append-only history truthful.

## D-022 · The need list is a set; adds are idempotent toggles
One live un-purchased entry per item, enforced by a partial unique index (the Bring!-style
tile/Command toggle UI assumes it). Add actions reuse the existing active entry, and a 23505 from
a two-phone race reuses the winner's row. There is no ?new=1 form on /groceries — capture is the
add box + tiles (≤2 taps).

## D-023 · Deleting a catalog item hides its entries; undo restores both
Item tombstone ≠ cascade: entries are never touched, but every list read filters out entries whose
embedded item is tombstoned. Restore the item and its entries reappear — undo stays symmetric
without bespoke cascade/restore machinery.

## D-024 · One whitelist-gated reorder action, not per-entity move clones
`moveSortable(table, id, direction)` (same shape as the soft-delete whitelist) does the
neighbor-swap for spend_categories, stores, and store_sections (scoped per store via
`scopeColumn`). M1's `moveSpendCategory` was folded into it.

## D-025 · Grocery social hangs on the item, not the entry
Comments/reactions on /groceries use `entity_type='grocery_item'` with the ITEM's id — entries are
churn (added, purchased, re-added weekly) and taking the conversation with them would orphan it.
ReactionsRow/CommentsSection were extracted from the spend drawer into shared
`components/screens/entity-social.tsx` (no-clones).

## D-026 · Meds countdown is deferred to M4 (M3 shows last-done only)
The master plan listed a "meds countdown" on the Maple profile in M3, but M3 renders only
"💊 Last meds {ago}". The countdown's cadence is owned by M4's task linkage (D-017: "Flea meds
every 4 wks after done, logs Meds") — completing the task auto-logs a Meds event and the next-dose
projection is `last Meds occurrence + task after_done interval`. Seeding a `config.recency` cadence
on the Meds type now would create a second, conflicting source of truth once M4 lands, so the
countdown display is built in M4 off the linked task's projection. Meds intentionally has no
recency block in the seed for the same reason.

## D-027 · EAV choice options are retired, not deleted; the picker filters them
Option ids derive from the label slug and logged `choice_ids` point at them, so an id is never
dropped (D-013). Editing an attribute marks options omitted from the settings textarea as
`archived: true` in `config.options` (kept for history); the log-form pickers use
`selectableAttributeOptions` (archived filtered out) while history/detail keep resolving the full
list via `attributeOptions`. Re-typing a removed label un-archives it. A label rename still mints a
new id (old retired) — true rename-in-place needs a structured per-row editor, deferred.

## D-028 · Pet-event edit clears only the rendered attributes' values
`fn_update_pet_event` deletes only `pet_event_values` whose `attribute_id` is in the form's
rendered set (`p_attribute_ids`), not all of them, so editing an old event's note no longer
hard-deletes values whose attribute was soft-deleted since logging. Preserves D-013's "event
survives its schema — orphan values are expected" and undo symmetry during an attribute-delete
window (D-012).

## D-029 · Calendar events are date-anchored with optional wall-clock time (single-day)
`calendar_events` store `starts_on date` (the day AND the recurrence grid anchor — the engine is
date-only, D-015) plus optional `start_time`/`end_time` (wall-clock, NULL when `all_day`). No
multi-day events in v1. Why: the household's real calendar items — vet appointments, date night,
anniversaries, trash day — are single-day and either timed or all-day; time-of-day is presentation
the renderer applies to each occurrence, never stored in the engine. A DB CHECK keeps the trio
coherent (all-day ⇒ no times; an end needs a start; end > start). Multi-day trips, if ever needed,
are a follow-up, not a v1 cliff.

## D-030 · Calendar = fixed events; Tasks = check-off cadences. Fixed tasks follow their grid
The two M4 surfaces split cleanly: **calendar events** are fixed-schedule things you *see*
(recurrence `fixed` only, per-occurrence exclusions D-016) and are grid-expanded onto the month;
**tasks** are things you *complete* (append-only completions D-017, freshness fade, optional pet
linkage). Tasks are NOT expanded onto the calendar grid — they live on the board. A task's freshness
ratio/stage is always recency-of-doing (`elapsed(lastDone→today)/period`), but its **due date**
depends on semantics: `after_done` chases the last completion (`lastDone + interval` — right for
"flea meds 4 wks after done"), while `fixed` follows its own grid via `nextOccurrence` independent
of when it was actually done (a fixed "trash every Tue" stays on Tuesdays even after a late
check-off), honoring D-015. This is why the task recurrence editor's fixed/after_done toggle and
weekday/day-of-month picks are load-bearing, not decoration.

## D-031 · Task completion + undo is one atomic RPC each (pet-event linkage rides along)
`fn_complete_task` writes the `task_completions` row AND, when the task links a pet-event type
(D-017), a bare `pet_events` row — both or neither (D-021; supabase-js has no transactions). The
completion stores `logged_pet_event_id` so `fn_undo_task_completion` can soft-delete BOTH the
completion and its auto-logged pet event, keeping Maple's feed and the next-dose countdown truthful
on undo (mirrors D-021's uncheck-retracts-price symmetry). This is why task completions do NOT use
the generic soft-delete whitelist — undo is bespoke. **D-026's meds countdown now lands here**: the
Maple profile projects the next dose off the `after_done` task whose `log_pet_event_type_id` is the
Meds type — one source of truth, no seeded recency cadence.
