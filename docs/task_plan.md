# goal-tree — Task Plan

> Snapshot taken 2026-05-08 on branch `dev` at commit `d59af11` (post-PR-#12 merge — quantity routines). **MVP complete; perf fix #1 + quantity routines shipped.**

## Goal

Ship a single-user, GitHub-OAuth-gated study helper / routine tracker on Vercel covering three MVP features: deadline countdown, daily routine status, and hierarchical markdown notes. Foundation locked on `dev`; features land one PR at a time via the workflow proven on issue #1.

## Phases

### Phase 1: Foundation — `complete`

Established the runtime + tooling baseline so per-feature work can land on a stable platform.

- Outputs:
  - Next 16 + React 19 + Tailwind 4 + TypeScript scaffold
  - Drizzle ORM (postgres-js driver) against Neon (prod) + Docker Postgres (dev/CI)
  - Auth.js v5 GitHub provider, single-ID allowlist, JWT session
  - `proxy.ts` (Next 16's renamed middleware) gates `app/(app)/**`
  - Zod-validated env loader at `src/lib/env.ts`
  - shadcn/ui primitives (Button, Card, Input, Label, then Dialog, Textarea, Badge added in Phase 2)
  - Vitest projects (unit / happy-dom, integration / node + `fileParallelism: false`)
  - Test helpers `withRollback` and `seedUser`
  - Pure domain helpers `src/domain/taipei.ts` (`TAIPEI_TZ`, `todayInTaipei`, `weekdayInTaipei`, `isWithinBackfillWindow`)
  - Playwright local-only (`pnpm test:e2e`)
  - GitHub Actions CI: lint → typecheck → migrate → unit → integration (Postgres service container)
  - PR template + README
- Reference: `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md`, `docs/superpowers/plans/2026-05-05-goal-tree-foundation.md`
- Commits: 25 commits between repo init and `46329a8`

### Phase 2: MVP feature 1 — Goals & countdown — `complete`

`/goals` page lists active goals, switches between calendar-day badge / live `Xh Ym` ticker (≤1 day) / red `Overdue Nd`, supports create + archive. Defense-in-depth `userId` scoping at every repo function.

- Issue: [#1](https://github.com/chienchuanw/goal-tree/issues/1)
- PR: [#4](https://github.com/chienchuanw/goal-tree/pull/4) — merged 2026-05-06 via rebase
- Openspec: archived at `openspec/changes/archive/2026-05-06-goals-and-countdown/`; canonical spec at `openspec/specs/goals/spec.md` (8 requirements)
- Plan: `docs/superpowers/plans/2026-05-06-goals-and-countdown.md`
- Tests: 27/27 unit + 12/12 integration green; CI green in 41s

### Phase 3: MVP feature 2 — Routines & daily status — `complete`

`/today` is now the default landing page after sign-in. Cadence-aware list of routines (daily or specific weekdays), tri-state cycle button (done / partial / skipped → unset deletes), 2-day backfill window, per-routine streak count + 30-day server-rendered heatmap. Defense-in-depth `userId` scoping on `routine_logs` via JOIN through `routines.userId` (no `user_id` column on the logs table).

- Issue: [#2](https://github.com/chienchuanw/goal-tree/issues/2)
- PR: [#5](https://github.com/chienchuanw/goal-tree/pull/5) — merged 2026-05-06 via rebase
- Openspec: archived at `openspec/changes/archive/2026-05-06-routines-and-daily-status/`; canonical spec at `openspec/specs/routines/spec.md` (9 requirements)
- Plan: `docs/superpowers/plans/2026-05-06-routines-and-daily-status.md`
- New domain helpers shipped: `src/domain/cadence.ts` (`appliesOn`), `src/domain/streak.ts` (`streakLength`, `build30DayHeatmap`, exported `shiftDate`)
- New shared infra: `src/lib/require-user-id.ts` extracted from goals + routines + routine_logs actions during simplify
- Tests: 61/61 unit + 35/35 integration green; CI green

### Phase 4: MVP feature 3 — Markdown notes with hierarchy — `complete`

`/notes` two-pane layout: recursive tree sidebar (max 3 levels) + CodeMirror 6 markdown editor with Preview toggle. Full CRUD: create (depth-respecting), save (blur + Cmd/Ctrl+S, no auto-save), rename, delete (cascade), move (depth-recomputing), set-goal (optional link). Markdown rendered with `react-markdown` + `rehype-sanitize` + `remark-gfm`.

- Issue: [#3](https://github.com/chienchuanw/goal-tree/issues/3)
- PR: [#6](https://github.com/chienchuanw/goal-tree/pull/6) — merged 2026-05-06 via rebase
- Openspec: archived at `openspec/changes/archive/2026-05-06-markdown-notes-hierarchy/`; canonical spec at `openspec/specs/notes/spec.md` (10 requirements)
- Plan: `docs/superpowers/plans/2026-05-06-markdown-notes-hierarchy.md`
- New runtime deps installed: `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `react-markdown`, `rehype-sanitize`, `remark-gfm`
- New domain helpers shipped: `src/domain/notes-tree.ts` (`assembleTree`, `flatNoteOf`, `findInTree`, `maxDepth`, `collectIds`); `src/lib/markdown.tsx` (`<MarkdownPreview>` RSC); `src/services/notes.ts` includes `validateOwnedGoal` helper
- New shared infra: `src/services/action-state.ts` extracted (`FormActionState` discriminated union now used by goals + routines + notes actions, replaces 5+ duplicate inline definitions)
- Tests: 26 new in-scope unit tests + 18 new integration tests green; build clean

### Phase 5: Post-MVP — Archive confirmation + restore — `complete`

Confirmation dialog gates archive on `/today` and `/goals` (eliminates the one-click data-loss footgun); new `/archive` page lists archived routines and goals with a Restore action that opens the same confirmation pattern. One reusable `<ConfirmActionButton>` client component drives all four sites (Archive/Restore × Routine/Goal).

- Issue: [#7](https://github.com/chienchuanw/goal-tree/issues/7)
- PR: [#8](https://github.com/chienchuanw/goal-tree/pull/8) — merged 2026-05-06 via rebase
- Workflow: this feature used `superpowers:writing-plans` directly (not openspec) since it sits inside existing capabilities (goals + routines) rather than introducing a new one. Spec at `docs/superpowers/specs/2026-05-07-archive-confirm-and-restore-design.md`; plan at `docs/superpowers/plans/2026-05-07-archive-confirm-and-restore.md`.
- New service surface: `unarchiveRoutine`, `listArchivedRoutines`, `unarchiveGoal`, `listArchivedGoals` (userId-scoped, idempotent, cross-user-safe via predicate). `unarchiveGoal` resets BOTH `status='active'` AND `archivedAt=null` because goals use both fields.
- New server actions: `unarchiveRoutineAction`, `unarchiveGoalAction`. Existing archive actions also gained `revalidatePath('/archive')`.
- Side fix bundled in: `archiveRoutine` and `archiveGoal` switched from `sql\`now()\`` to `sql\`clock_timestamp()\``. `now()` is `transaction_timestamp()` (constant per tx), which made multi-archive-in-one-tx writes share a single timestamp and break DESC-ordered reads / `withRollback` ordering tests. Same root cause as the notes-feature `now()` fix.
- New UI: `<ConfirmActionButton>` (shadcn Dialog wrapper, `useTransition` pending guard); 4 thin server-component shims; `app/(app)/archive/page.tsx` with two sections + restore actions; `NavTabs` gained "04 · Archive" entry (mobile grid `grid-cols-3` → `grid-cols-4`).
- Final simplify pass: extracted `formatTaipeiDateLabel` to `src/domain/taipei.ts` (deduplicated from `GoalCard` and `/archive`); removed unused `triggerClassName` prop; replaced variant ternary with `Record<Variant, string>` lookup.
- Skipped: Task 11 (E2E archive→restore happy path) — `tests/e2e/` has no auth-bypass scaffolding for the OAuth-gated app. Worth a separate issue if E2E coverage is wanted.
- Tests: 10 new integration tests (5 unarchive routines + 5 unarchive goals) + 4 new ConfirmActionButton unit tests, all green; existing 65/65 integration + remaining unit tests green; TypeScript clean.

### Phase 7: Perf — region co-location + per-request query parallelism — `complete`

Production diagnosed as 1–2 s per route + ~3.6 s per status-cycle click. Root cause: 3-region geographic mismatch between Vercel function (`iad1`, US East) and Neon DB (`ap-southeast-1`, Singapore) — every DB round-trip cost ~220 ms across the Pacific. Fix pins functions to `sin1` so they sit in the same AWS region as the DB; secondary fix raises `postgres-js` `max` so per-request `Promise.all` queries actually parallelize.

- Issue: [#9](https://github.com/chienchuanw/goal-tree/issues/9)
- PR: [#10](https://github.com/chienchuanw/goal-tree/pull/10) — merged 2026-05-07
- Workflow: this issue skipped openspec (it's an infra/config tweak, not a capability change). Diagnosis was driven by Playwright MCP (RSC fetch timing + `x-vercel-id` headers).
- Files touched:
  - `vercel.json` (new): `{ "regions": ["sin1"] }`
  - `src/db/client.ts`: `max: 1 → 5`; comment trimmed to the non-obvious `prepare: false` (Neon pgbouncer transaction-mode requirement)
- Gotcha bundled into findings.md: Next 16's route-segment `preferredRegion` config only accepts `'auto' | 'global' | 'home'` on Vercel, and only with `runtime = 'edge'`. Pinning a Node-runtime serverless function to a specific Vercel region is done in `vercel.json` `regions`, not in route segment config.
- Verification: deferred until next deploy. Acceptance criteria captured on the issue (warm `/today` < 500 ms, others < 300 ms, `x-vercel-id` shows `sin1`).

### Phase 8: Quantity routines — `complete`

`/today` now supports a second routine kind alongside check routines: quantity routines log a numeric value per day (e.g. minutes of exercise) with an optional unit and daily target, and render a 30-day bar chart with a goal line instead of the heatmap. Existing check routines are unchanged. Streak logic is reused via a derived `'done'` status, so `domain/streak` did not need to change.

- Issue: [#11](https://github.com/chienchuanw/goal-tree/issues/11)
- PR: [#12](https://github.com/chienchuanw/goal-tree/pull/12) — merged 2026-05-08 via rebase
- Workflow: brainstorming → spec → writing-plans (12 tasks) → gh-issue → gh-dev → executed inline → gh-pr → review fix on the same branch → merge.
- Spec: `docs/superpowers/specs/2026-05-08-quantity-routines-design.md`
- Plan: `docs/superpowers/plans/2026-05-08-quantity-routines.md`
- Schema: `routines` gets `kind` (`'check'|'quantity'`, default `'check'`), `unit`, `daily_target`. `routine_logs` gets `value`. Three CHECK constraints: `kind` enum, unit-required-iff-quantity, `daily_target > 0`. Existing rows backfill to `kind='check'` via column default.
- New domain helper: `src/domain/quantity-routine.ts` `deriveQuantityStatus(value, target)` — used by `setRoutineLogValue` and form-side computations; returning `null` signals the caller to delete the row (zero-value days stay out of the streak window).
- New services: `incrementRoutineLog`, `setRoutineLogValue` in `src/services/routine_logs.ts`. `setRoutineStatus` was gated to reject quantity routines so the two write paths can't trample each other.
- **Race fix during review (commit `d59af11`):** the original `incrementRoutineLog` did read-modify-write at READ COMMITTED, which can lose increments under concurrent calls. Switched to atomic SQL-side addition: `INSERT ... ON CONFLICT DO UPDATE SET value = routine_logs.value + delta, status = CASE WHEN value + delta >= threshold THEN 'done' ELSE 'partial' END`. Removed the now-unreachable `?? 'partial'` fallback.
- New components: `BarChart30` (pure CSS, 30 vertical bars, emerald-500 at/above target, emerald-300 partial, paper-tint zero, optional goal line) and `QuantityLogInput` (numeric input + Add, optimistic update via `useTransition`). `RoutineRow` branches on `routine.kind`. `CreateRoutineForm` gains a Kind toggle that conditionally surfaces Unit (required) and Daily target (optional).
- Skipped: Task 12 (E2E happy path) — `tests/e2e/` still has only `.gitkeep` and no auth fixture; deferred until E2E scaffolding lands.
- Tests: 11 new unit + 11 new integration tests; full suite 120 unit + 76 integration green.

### Phase 6: Cleanup pass — `complete`

Two follow-up commits that landed directly on `dev` after PR #8 merged.

- Fixed 4 pre-existing unit-test failures from the `da5978d` UI redesign — tests were querying split text nodes (`getByText('4h 23m')`) when the visible text is broken across multiple `<span>` elements. Switched to accessible-name queries: `getByLabelText('4 hours 23 minutes remaining')` for `<HoursCountdown>` (3 tests) and `toHaveAccessibleName(/done/i)` instead of `toHaveTextContent` for `<StatusCycleButton>` (1 test). Commit `105993a`. All 93 unit tests now pass.
- Visual tweak: `Heatmap30` "done" cells now render as `bg-emerald-500` (was `bg-ink`/black). Added a 2-test unit file `tests/unit/components/routines/Heatmap30.test.tsx` asserting the color mapping. Commit `3ee423f`.

## Workflow per feature (proven on issue #1)

1. `gh-dev` → branch `issues/N` from `dev`
2. `openspec-propose` → `proposal.md` + `design.md` + `specs/<capability>/spec.md` + `tasks.md` (validates `--strict`)
3. `superpowers:writing-plans` → bite-sized TDD plan in `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`
4. `superpowers:subagent-driven-development` → fresh subagent per task, no `Co-Authored-By`
5. `simplify` → 3 parallel reviewers (reuse / quality / efficiency), apply high-confidence fixes
6. `gh-pr` → push + create PR closing `#N`
7. After merge: `openspec archive <name>` → promotes the delta spec to `openspec/specs/<capability>/spec.md`
8. Refresh README + this plan + `progress.md` via `gh-archive`

## Decisions log

| Decision | Where it lives | Why |
|---|---|---|
| Single-user, GitHub OAuth gated, allowlist of one | `src/lib/auth.ts` | Public deploy on Vercel without rolling auth from scratch |
| Asia/Taipei hard-coded as the display tz; UTC stored | `src/domain/taipei.ts`, schema `timestamptz` | One operator, one tz; future migration if needed |
| Local Docker Postgres on host port `5433` | `docker-compose.yml`, `.env.local` | Avoids collision with host-installed Postgres on 5432 |
| Domain pure / services orchestrate / `'use server'` actions wrap services | `src/{domain,services}/` split | Keeps repo functions integration-test-friendly via `withRollback` |
| `db: DbOrTx = defaultDb` injection in repo signatures | `src/db/client.ts`, `src/services/goals.ts` | Lets integration tests pass a tx-bound client |
| BDD `describe('Given …', () => describe('When …', () => it('Then …')))` test naming | All test files | One discipline across unit + integration + component |
| `"packageManager": "pnpm@10.33.0"` pinned in `package.json`; `pnpm/action-setup@v4` infers from it | `package.json`, `.github/workflows/ci.yml` | Single source of truth, no local/CI drift |
| Two-commit RED → GREEN pattern for TDD steps | Plan instructions | Failing-first commits visible in `git log` for audit |

## Errors encountered (cross-phase, kept brief — full details in findings.md)

| Error | Phase | Resolution |
|---|---|---|
| `actions/setup-node@v4` failed: "packages field missing or empty" | 2 (PR #4 review) | Pinned `packageManager` in package.json; dropped `with: version: 9` |
| `pgTable` extraConfig as object → deprecated | 1 | Migrated all 4 feature tables to array-returning callback |
| `z.string().datetime({offset:true})` → deprecated in Zod 4 | 1 / 2 | `z.iso.datetime({offset:true})` |
| `poolOptions` removed in Vitest 4 | 1 | Use top-level `fileParallelism: false` on integration project |
| Host Postgres on 5432 intercepted Docker Postgres | 1 | Moved Docker to host port 5433, updated env + plan |
| Next 16 deprecated `middleware.ts` | 1 (post-build warning) | Renamed to `proxy.ts`; updated spec + plan |
| Next 16 client-component prop function names must end in `Action` | 2 | Renamed `onSuccess` → `onSuccessAction` |
| Next 16 route-segment `preferredRegion` rejects region codes on Vercel | 7 | Pinned function region in `vercel.json` `regions: ["sin1"]` instead |

## Open work

- **E2E test scaffolding (skipped from PR #8)**: `tests/e2e/` is empty and there's no auth-bypass fixture for the GitHub-OAuth gate. Adding a Playwright auth-state fixture would unblock both the planned archive→restore happy path and any future E2E coverage.
- **Optional cosmetic from PR #4**: `useLiveTicker` boundary recompute, `HoursCountdown` minute-boundary alignment.
- **Optional from PR #5**: `useOptimistic`-or-`useEffect`-reset for `StatusCycleButton` stale-prop after revalidation — happy path doesn't diverge today, but worth a revisit if a real race surfaces.
- **Optional from PR #6**: `moveNote` server-side cycle check (currently relies on the move dialog disabling descendants client-side; a real cycle guard would need a recursive walk in SQL); `<EditorPane>` body-state could be lifted out of `<NoteEditor>` if preview-while-typing becomes desired (currently preview reflects last-saved per design D4).
- **Post-MVP enhancements** (deferred per design spec §11): note search/full-text, backlinks, tags, file/image attachments, auto-save while typing, drag-to-reorder tree, inline math (KaTeX/LaTeX), routine templates, push reminders.
