---
description: Full-roster Maple & Co review that then auto-applies the win-only fixes
argument-hint: "[scope words | \"unreviewed work\"] [--artifacts .claude/plans/code-review-YYYY-MM-DD]"
---

Run the maximum Maple & Co review.

Load `.claude/commands/code-review.md` and follow it as the controlling instruction with `$ARGUMENTS` equivalent to:

```text
max $ARGUMENTS
```

Non-negotiables for this alias:

- **Review phase is read-only; then auto-apply the win-only fixes.** The 4 specialists only produce findings. After the compiler writes the report, this session **applies every win-only fix** — clearly-correct changes that need no decision from Jake (mechanical clone→primitive migrations, unambiguous bug fixes, missing real-logic tests, lint/type/dead-code fixes). Anything needing a UX/scope/design judgment call is **not** applied — it goes to **Open Questions For Jake**. Do not ask permission to start the fix wave; rolling into it is the default here.
- **Full roster + model tiering, automatically.** Use all four specialists (Usability & Flow, UI & Component Consistency, Correctness/Data/Safety, Architecture & Abstraction) plus the compiler. Tier models per the parent command (opus for Correctness + Compiler; sonnet for Usability/UI/Architecture; haiku for grep fan-out). Jake shouldn't have to ask.
- **Commit at savepoints, never push.** During the fix wave make local `git commit` savepoints at logical groupings without asking. Do not `git push` or `db:push`.
- **Verify before handoff.** Re-run `npm run check` (or the relevant subset) after the fix wave and report the real result — including failures.
- **Open Questions get description + options + recommendation.** Skip questions whose default is obvious; state the default and proceed instead of manufacturing one.
- A specialist may be skipped when its whole domain is out of scope — say so and why.
