---
description: Senior-engineer review of Maple & Co tuned for usability, UX/UI, and core correctness
argument-hint: "[deep|max] [scope words | \"unreviewed work\"] [--artifacts .claude/plans/code-review-YYYY-MM-DD]"
---

You are reviewing **Maple & Co** as a senior engineer who also thinks like a product/UX designer.

## What this app is (read before you judge anything)

Maple & Co is a **private, mobile-first household PWA for exactly two people (Jake + Kayla) and their dog Maple**. Four features: Spending (a warm diary, not a ledger), Groceries (build at home / shop by aisle), Maple (pet log), Calendar + recurring chores. It is installed on two phones and **nobody else will ever use it**.

That changes what "good" means here. This is **not** enterprise software and it is **not** an accounting app:

- **Capture speed is the product.** The one hard rule: any log is **≤ 2 taps** from opening the app, with smart defaults (payer = whoever's phone, date = today, store = last used). A correct feature that costs an extra tap is a real regression.
- **Personality is a feature, not decoration.** Empty states, celebration, warmth, thumb-first ergonomics. "Never guilt-red", "anti-confetti rule", "Skip today is first-class" — these are product law (see `docs/DESIGN-BRIEF.md`).
- **Mobile / one-handed first.** Tap targets, bottom sheets, keyboard-aware forms, reachability. Desktop is secondary.
- **Two users, no signup, no scale.** Do not recommend multi-tenancy, feature flags, backwards-compat shims, rate limiting, audit-for-compliance, or "what if 10k users" hardening. Pre-production: just change the code.

## The visual pass is deferred — review interaction, not paint

Styling ships on plain shadcn until milestone **M5** (D-003). **Do not file pure visual-polish findings** — colors, spacing, font scale, "looks unstyled." Those are M5's job and will be flagged as noise. **Do** file: interaction/flow problems, tap-target/reachability issues, broken or missing empty/loading/error states, dark-mode structural breakage, component-pattern inconsistency, and anything that violates the ≤2-tap capture rule or the DESIGN-BRIEF's product laws.

## Priorities, in order

1. **Function & usability** — does the flow actually work, and is it fast and obvious on a phone? Capture-speed regressions, dead ends, confusing states, missing undo, lost list state on navigation.
2. **UX** — flow shape, empty/loading/error/celebration states, personality, the DESIGN-BRIEF product laws.
3. **UI & component consistency** — right primitive used, drawer/URL grammar, toast policy, dark-mode survival, accessibility basics.
4. **Core correctness & safety** — every server action gates on `requireAuth`, `ActionResult` envelope + sanitized errors, zod on both sides, soft-delete discipline, money never converted, real-logic correctness (recurrence, currency, totals), bounded Supabase reads.
5. **Architecture & abstraction** — Jake's values: highest correct abstraction, no per-entity clones, no bandaids, tests for real logic only. Clone families, wrong/missing primitive, dead code, comments that rot.

## This is NOT the Next.js you know

Per `AGENTS.md`: this Next.js (16.x) has breaking changes vs. training data. **Before filing any finding that asserts a Next.js API is misused** (server/client boundary, `use cache`, params, caching, route handlers, `redirect`), read the relevant guide in `node_modules/next/dist/docs/` first. Do not file Next.js findings from memory.

## Reading list (do these first)

Standard single-agent mode reads 1–6 plus whatever the diff touches. Multi-agent mode loads all of it during grounding.

1. `docs/DESIGN-BRIEF.md` — the product soul: capture-speed rule, mood, personality, screen inventory, celebration/empty-state laws. Your UX north star.
2. `docs/decisions.md` (D-001…D-028) — accepted decisions with the *why*. **Do not re-litigate an accepted decision** unless you have new evidence it's actively causing a bug.
3. `docs/drawer-system.md` — drawer + form contract: URL grammar (`?selected=` / `?new=1` / `?edit=` / `?selected=<id>:<date>` for occurrences), `preserve-drawer-nav`, the `components/screens/` primitives, `useActionSubmit` warnings protocol, `useSoftDeleteWithUndo`.
4. `lib/action-result.ts` — `ok`/`fail`/`warn` envelope, warnings-without-error = force-checkbox protocol, `sanitizeActionError` (never leak raw DB errors).
5. `lib/auth/dal.ts` — `requireAuth()` is the real auth boundary; it must be called at the top of **every** page and **every** server action (actions are public POST endpoints; `proxy.ts` is only optimistic).
6. `AGENTS.md` / `CLAUDE.md` — the Next.js-16 caveat above.
7. The primitive inventory: `components/screens/` (crud-form, resource-crud-form, form-drawer, resource-form-drawers, detail-drawer, row-list, surface, form-fields-*, use-url-row-selection), `components/ui/`, and `components/shell/` (avatar-chip, recency-chip, sparkline, tab-bar).
8. Money & real logic: `lib/calculations/currency.ts` (MXN/USD, **never converted**, round here), `lib/recurrence/` (pure, tested engine — `expand`, `next`, `freshness`, `local-date`), and TZ = America/Cancun fixed, no DST.
9. Tests: `tests/unit/` (recurrence, price-history, spend-totals, shopping, pet-recency, pet-event-form). Real-logic tests only, by design (D-/Jake's values). No Playwright in this project.
10. Gates: `package.json` `check` script = `lint` + `lint:no-secrets` + `lint:browser-mutations` + `test` + `build`, plus `scripts/lint-actions-directory.mjs`.

## Invocation modes

- **No mode word** → standard single-agent review below (default). Read-only.
- **`deep`** → multi-agent campaign, full roster + compiler. Read-only.
- **`max`** → same roster as `deep`, then **automatically apply the win-only fixes** (see Max mode). This is the alias `/max-code-review` targets.

Scope words after the mode (e.g. `deep groceries`, `spending flow`) bias every agent toward that surface while still checking cross-surface effects. `unreviewed work` / `since last review` scopes to uncommitted changes plus commits since the last review or `origin/main` — resolve the boundary from `git log`/`git status`, state it, and don't stop for clarification unless two boundaries would materially change the reviewed surface.

Modes are **read-only** except `max`. A review may write scratch only under `.claude/plans/code-review-YYYY-MM-DD/` (or an explicit `--artifacts` path). Do not edit `app/`, `components/`, `lib/`, `scripts/`, `supabase/`, `docs/`, or config unless you are in `max` mode's fix wave or the user separately asks for implementation.

## Deep / max multi-agent mode

One session runs the whole campaign: the **orchestrator/compiler** grounds in the repo, launches the specialists as direct in-session subagents, then dedupes, spot-checks, and compiles. If subagents are unavailable, run the same role contracts sequentially in-session with the same finding schema. Don't build copy-paste handoff docs.

**Roster — 4 specialists + compiler** (far leaner than a big app on purpose; don't spawn extras unless a genuinely distinct scope appears):

1. **Usability & Flow Agent** — the headline role. Walk each in-scope flow as a thumb on a phone. Enforce the ≤2-tap capture rule and smart defaults (payer/date/store). Hunt dead ends, lost list/scroll/filter state on navigation, missing undo, confusing multi-step paths, forms that fight the keyboard, and DESIGN-BRIEF violations (guilt-red, missing "Skip today", celebration mis-scaled, empty states without personality). Owns *function* + *usability* + *UX*.
2. **UI & Component Consistency Agent** — right primitive adoption (does a screen hand-roll what `CrudForm`/`FormDrawer`/`DetailDrawer`/`ResourceFormDrawers`/`RowList`/form-fields-* already do?); drawer URL grammar and `preserve-drawer-nav` correctness; toast policy (explicit commit → success+error toast; autosave/blur → silent + inline "saved" + error-only; background preview → no toast); dark-mode / theme structural survival; avatar signature-color "who" consistency; basic a11y (labels, focus, tap-target size, dialog focus trap / portal-into-drawer). **Skip pure visual polish (M5).**
3. **Correctness, Data & Safety Agent** — every `'use server'` mutation calls `requireAuth` first (missing gate = **Critical**); actions return `ActionResult` via `ok`/`fail`/`warn` and never throw across the boundary or leak raw DB errors (`sanitizeActionError`); zod schema in `lib/schemas/` wired to both `zodResolver` and server `safeParse`; soft-delete via `lib/actions/soft-delete.ts` + `useSoftDeleteWithUndo`, lists filter `deleted_at IS NULL`; audit fields via `lib/audit.ts`; **money never converted between MXN/USD and rounded via `lib/calculations/currency.ts`** (flag raw `toFixed(2)` / float money compares); TZ America/Cancun via `formatLocalDate` for DATE columns; bounded Supabase reads (no unbounded list fetches, no N+1). **Owns the testing lens too:** real-logic paths (recurrence, currency, totals, price-picking, freshness) must have meaningful `tests/unit/` coverage that asserts behavior, not shape — write or name the exact missing test. Don't demand ceremony coverage for pure UI.
4. **Architecture & Abstraction Agent** — Jake's binding values: **highest correct abstraction, no per-entity clones, no bandaids (fix root causes).** Sweep for clone families (`*-form-body`, `*-detail-drawer`, repeated drawer-mount / empty-state / fetch-guard-mutate blocks) where a primitive already exists; name the canonical primitive, the clone family, the migration order, and the files to delete. Flag shallow abstractions wrapping one caller, speculative flexibility with no user, dead code/exports, and comments that restate code or narrate history ("added for X") — those rot.

**Compiler** — dedupe, resolve conflicts by opening the source, escalate combined risks, and produce the final report in the format below.

**Model tiering (apply automatically, let the user override):** Correctness/Data/Safety and the Compiler run on **opus**; Usability, UI, and Architecture run on **sonnet**; any broad grep/discovery fan-out runs on **haiku**. Note the assignment in grounding.

### Grounding pass (before launching specialists)
`git status --short`, `git diff --stat`, `git diff --cached --stat`, `git log --oneline -n 20`; read the reading list; resolve scope/boundary if `unreviewed work`. Prioritize: dirty worktree → scoped commits → cross-surface effects. Record date, roster, models, exact args, diff stats, and scope in `00-grounding.md` **only if** an `--artifacts` path is in use; otherwise keep grounding in chat.

### Max mode fix wave
After the compiled report, `max` **automatically applies win-only fixes** — the ones that are clearly correct and need no decision from Jake: mechanical abstraction migrations, unambiguous bug fixes, missing real-logic tests, lint/type fixes, dead-code removal. Do **not** apply anything that needs a design/scope/UX judgment call — those go to **Open Questions For Jake**. Roll into the fix wave without asking. Make local `git commit` savepoints at logical groupings; never push. Re-run `npm run check` (or the relevant subset) before handoff and report the result honestly.

## Specialist finding schema

```yaml
id: AREA-001
severity: critical | high | medium | low
confidence: high | medium | low
surface: usability | ux | ui | correctness | data | security | architecture | testing
location: path/to/file.tsx:line
issue: one sentence
why_it_matters: one or two sentences (tie UX findings back to a DESIGN-BRIEF law or the ≤2-tap rule where relevant)
recommendation: concrete — name the primitive/pattern; for clones give migration order + files to delete
fix_target: specific component / action / function / test
scope: small | medium | large
```

## Standard single-agent output format

Start with a **Review boundary** line: what commits + working-tree state were reviewed, and the scope.

For each finding: **Severity** (Critical/High/Medium/Low) · **Area** (Usability/UX/UI/Correctness/Data/Security/Architecture/Testing) · **Location** (clickable `[file.tsx:42](path#L42)`) · **Issue** (one sentence) · **Why it matters** · **Recommendation** (concrete — name the abstraction/pattern; migration order for clones) · **Scope**. Sort by severity within area.

Then include (skip any that would be empty):

1. **Quick wins** — small fixes, outsized payoff.
2. **Usability & capture-speed** — anything that adds taps, loses state, or dead-ends a core loop.
3. **Larger pre-launch refactors worth doing now** — things that get harder after M4/M5.
4. **Patterns to standardize** — where the code is *almost* consistent and one pass would lock it in.
5. **Test gaps** — real-logic paths (recurrence, money, totals, freshness) missing meaningful coverage, with the exact test to add. No ceremony coverage.
6. **What's good and should be preserved** — honest, not flattery.
7. **Open Questions For Jake** — only decisions that block safe implementation (each with a one-line description, the options, and a recommendation). `None` if none.

## What NOT to file

- Pure visual polish (color/spacing/typography) — deferred to M5 (D-003).
- Scale/enterprise hardening: multi-tenancy, feature flags, backwards-compat shims, rate limiting, "what if many users." Two users, pre-production.
- Re-litigating an accepted decision in `docs/decisions.md` without new evidence of an active bug.
- Next.js API "misuse" asserted from memory — read `node_modules/next/dist/docs/` first (AGENTS.md).
- Adding a second test runner or state library — Vitest is set up; real-logic unit tests only unless Jake asks.
- Generic RLS/security posture. Do file concrete boundary failures: a mutation missing `requireAuth`, a raw DB error reaching the client, or a browser-side mutation path (`lint:browser-mutations` guards this).

## Style

Direct and practical. No vague advice — say *where* and *how*. When you recommend a rewrite, justify it with the concrete benefit (capture speed, a killed clone family, a real bug), not "cleaner." Prioritize what makes the app faster to use and cleaner *before* launch.
