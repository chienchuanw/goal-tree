# goal-tree — Task Plan

> Snapshot taken 2026-05-06 on branch `dev` at commit `aaec279`. Manus-style plan tracking the MVP build.

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

### Phase 3: MVP feature 2 — Routines & daily status — `pending`

`/today` becomes the default landing page. Cadence-aware list of routines (daily or specific weekdays), tri-state cycle button (done / partial / skipped), 2-day backfill window, per-routine streak count + 30-day mini-heatmap.

- Issue: [#2](https://github.com/chienchuanw/goal-tree/issues/2)
- New domain helpers planned: `src/domain/cadence.ts` (`appliesOn`), `src/domain/streak.ts` (`streakLength`, `build30DayHeatmap`)
- Reuses `isWithinBackfillWindow` from Phase 1 foundation for the 2-day backfill guard
- Will follow the workflow validated in Phase 2 (see "Workflow per feature" below)

### Phase 4: MVP feature 3 — Markdown notes with hierarchy — `pending`

`/notes` two-pane layout (tree sidebar + editor). Recursive note tree max 3 levels deep (depth 0/1/2 enforced by existing CHECK constraint). CodeMirror 6 in markdown mode with a Preview toggle. Save on blur + Cmd/Ctrl+S only — no debounced auto-save in MVP.

- Issue: [#3](https://github.com/chienchuanw/goal-tree/issues/3)
- New runtime deps to add: `@codemirror/lang-markdown`, `@uiw/react-codemirror`, `react-markdown`, `rehype-sanitize`, `remark-gfm`
- Editor MUST be client-only with dynamic import + `ssr: false` (CodeMirror is browser-only)
- Will follow the same workflow

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

## Open work

- Phase 3 (Routines) — not yet started
- Phase 4 (Notes) — not yet started
- Optional cosmetic items deferred from PR #4 (see PR #4 status comment): `useLiveTicker` boundary recompute, `HoursCountdown` minute-boundary alignment
