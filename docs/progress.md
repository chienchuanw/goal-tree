# goal-tree — Progress Log

Reverse-chronological log of meaningful work sessions. Newest entry first.

---

## 2026-05-06 — gh-archive: openspec archive + README + planning files

**Branch:** `dev` (post-merge of PR #4) at `aaec279`.

**What happened:**

- PR #4 (Goals & countdown) merged into `dev` via rebase at 03:40 UTC.
- Switched off `issues/1`; deleted local branch (was at `a478bcf`, merged into `dev` at `2b14d6a`).
- Ran `openspec archive goals-and-countdown -y`:
  - Moved `openspec/changes/goals-and-countdown/` → `openspec/changes/archive/2026-05-06-goals-and-countdown/`
  - Created the canonical spec at `openspec/specs/goals/spec.md` (8 requirements promoted from the delta spec)
  - Committed as a separate `docs(openspec):` commit so the archive step is auditable
- Refreshed `README.md`: added a Status table (issue links + PR link), noted the `packageManager` pin in the Stack section, expanded the Workflow section to include `writing-plans`, `simplify`, and the `openspec archive` step, and linked the new canonical spec + the archived change.
- Wrote/updated this set of planning files under `docs/`:
  - `docs/task_plan.md` — 4 phases, decisions log, error log
  - `docs/findings.md` — Next 16 + library deprecations, CI/pnpm pitfall, Postgres collision, React 19 patterns, shadcn specifics, Drizzle integration-test pattern, defense-in-depth scoping
  - `docs/progress.md` — this file

**Tests:** Not re-run (no code changes in this session — all docs/openspec only).

**Next:** Pick up MVP feature 2 (Routines & daily status — issue #2) using the same workflow proven on issue #1.

---

## 2026-05-06 — PR #4 review loop: CI fix + status reply

**Branch:** `issues/1`.

**What happened:**

- Read self-authored review comment on PR #4. Root cause of CI red: `actions/setup-node@v4` errors with "packages field missing or empty" because `package.json` had no `packageManager` field. Three other observations were marked optional/cosmetic.
- Fixed in commit `a478bcf`:
  - `package.json`: pinned `"packageManager": "pnpm@10.33.0"` (matches local pnpm version that generated `pnpm-lock.yaml`).
  - `.github/workflows/ci.yml`: removed `with: version: 9` from `pnpm/action-setup@v4` so the action reads from `package.json` (single source of truth).
- Pushed; CI green in 41s.
- Posted status comment on PR #4 acknowledging the fix and accepting/deferring the three cosmetic observations with rationale.

**Tests after fix (local, post-rebase verification):** 27/27 unit + 12/12 integration green.

---

## 2026-05-06 — Issue #1 (Goals & countdown) executed end-to-end

**Branch:** `issues/1`.

**What happened (chronological):**

1. `gh-dev` → branch `issues/1` linked to issue #1, based on `dev`.
2. `openspec-propose` → `goals-and-countdown` change scaffolded; wrote `proposal.md`, `design.md` (10 design decisions D1–D10), `specs/goals/spec.md` (8 requirements with Given/When/Then scenarios), `tasks.md` (7 task groups). Committed as `docs(openspec): propose goals-and-countdown change` (`502251e`); validates `--strict`.
3. `superpowers:writing-plans` → `docs/superpowers/plans/2026-05-06-goals-and-countdown.md` with 11 tasks ~50 bite-sized steps. Committed as `0731cb3`.
4. `superpowers:subagent-driven-development` → dispatched fresh subagents per task. Two RED→GREEN-split commits for the TDD tasks (Tasks 1 and 5). Tasks 7–10 batched as one coherent commit because the page imports components from later tasks; intermediate states won't compile.
5. Two in-flight Next 16 / Zod 4 deprecation fixes that surfaced during execution:
   - `fix(lib/zod): use z.iso.datetime (Zod 4 deprecated z.string().datetime)` (`d58327a`)
   - `fix(goals): rename onSuccess→onSuccessAction (Next 16 client-prop rule)` (`2c8e1fc`)
6. `simplify` → 3 parallel reviewers (reuse / quality / efficiency). Applied 5 high-confidence findings in `refactor(goals): simplify after review` (`afe5378`):
   - `daysUntil` reuses `todayInTaipei` for the default-tz path
   - `naiveDateTimeToTaipeiIso` extracted from `goals.actions.ts` into `src/domain/taipei.ts`
   - `<HoursCountdown>` overdue branch delegates to `<CountdownBadge>`
   - `CreateGoalForm` moved success callback into `useEffect`
   - `defaultDeadlineLocalString` memoized via `useMemo`
7. `gh-pr` → pushed `issues/1`, opened PR #4 against `dev` with full body referencing the openspec change and acknowledging the workflow.

**Final pre-merge checks:** lint clean, typecheck clean, 27/27 unit, 12/12 integration, build clean.

---

## 2026-05-05 — Foundation shipped (25 commits)

**Branch:** `dev`.

**What happened:**

- Brainstormed → wrote design spec (`docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md`) → wrote 18-task foundation plan (`docs/superpowers/plans/2026-05-05-goal-tree-foundation.md`).
- Executed all 18 tasks via `superpowers:subagent-driven-development`. Six mid-plan corrections applied in dedicated `fix:` commits so the cause/effect is auditable in `git log`:
  1. Added `build:ci` to bypass `dotenv` wrapper for Vercel/CI builds.
  2. Switched `z.string().url()` → `z.url()` (Zod 4 deprecation).
  3. Replaced removed `poolOptions` with `fileParallelism: false` on integration project (Vitest 4).
  4. Switched Drizzle table extraConfig from object → array form.
  5. Moved Docker Postgres to host port 5433 (host PG on 5432 intercepted connections).
  6. Renamed `middleware.ts` → `proxy.ts` (Next 16 convention rename).
- Filed three GitHub issues for the MVP features (#1 Goals & countdown, #2 Routines & daily status, #3 Markdown notes) via the `gh-issue` skill.

**Final foundation checks:** lint 0/0, typecheck clean, 10/10 unit, 1/1 integration (smoke), build clean.

**HEAD after foundation:** `46329a8 chore(lint): ignore .remember/ skill artifacts`.
