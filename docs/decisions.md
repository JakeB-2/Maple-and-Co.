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
