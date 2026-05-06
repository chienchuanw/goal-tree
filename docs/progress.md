# goal-tree — Progress Log

Reverse-chronological log of meaningful work sessions. Newest entry first.

---

## 2026-05-06 — Issue #3 (Markdown notes with hierarchy) executed end-to-end + archived — **MVP complete**

**Branch:** `issues/3` (now merged); archive landed on `dev` at `3ea7774`.

**What happened (chronological):**

1. `gh-dev` → branch `issues/3` linked to issue #3, based on `dev`.
2. `openspec-propose` → `markdown-notes-hierarchy` change scaffolded; wrote `proposal.md`, `design.md` (11 design decisions D1–D11 covering single-query tree assembly, depth computed in createNote, moveNote with descendant walk, save semantics blur+Cmd/Ctrl+S no auto-save, react-markdown+rehype-sanitize+remark-gfm pipeline, CodeMirror dynamic-import with ssr:false, defense-in-depth via JOIN-less `userId` scoping, Zod 4 schemas, Next 16 client-prop names pre-validated, test layering), `specs/notes/spec.md` (10 requirements with Given/When/Then), `tasks.md` (11 task groups). Validates `--strict`.
3. `superpowers:writing-plans` → `docs/superpowers/plans/2026-05-06-markdown-notes-hierarchy.md` with 11 tasks ~70 bite-sized steps.
4. `superpowers:subagent-driven-development` → 4 batched implementer dispatches (Batch A: deps install / Batch B: domain assembleTree + Zod + markdown pipeline / Batch C: services + actions / Batch D: UI components + pages). RED→GREEN split commits visible in `git log` for TDD tasks (2, 5).
5. Two in-flight fixes surfaced during execution:
   - `now()` → `clock_timestamp()` in `notes.ts` UPDATE statements. Postgres' `now()` is `transaction_timestamp()` (constant per tx); `withRollback` runs each integration test inside one tx, so `updated_at` never advanced and the saveNote test failed (`expected X to be greater than X`). `clock_timestamp()` is the per-call wall-clock function.
   - `<EditPreviewToggle>` refactored from `renderEdit/renderPreview` callbacks to `editView/previewView` ReactNode slots. Next 16's TS plugin flags ALL function-typed props on `'use client'` components — not just callbacks crossing to a server action. ReactNode slots sidestep the rule entirely without lying with an `Action` suffix on a non-action prop.
6. Also caught and reported but NOT in scope: 4 PRE-EXISTING test failures on `dev` from commit `da5978d` (UI redesign of authentication/UI components) — `HoursCountdown × 3`, `StatusCycleButton × 1`. The DOM structure of `4h 23m` and the cycle button changed; tests need assertion updates. Flagged in PR #6 body as a follow-up.
7. `simplify` → 3 parallel reviewers (reuse / quality / efficiency). Applied 6 high/medium-confidence findings in `refactor(notes): simplify after review` (`f1dd62c`):
   - Extracted `FormActionState` shared discriminated union to `src/services/action-state.ts` — used 5+ times across goals + routines + notes actions; notes alone had 3 inline copies.
   - Extracted `validateOwnedGoal(tx, goalId, userId)` helper inside `notes.ts` — replaced 2 copies (createNote + setNoteGoal).
   - Killed double `listNoteTree` query on `/notes/[id]` — added pure `resolveBreadcrumb(rows, id)` so the page fetches the user's notes once and computes the breadcrumb in JS. Cuts one query per detail-page render.
   - Cleaned up `buildParentOptions` in `/notes/[id]/page.tsx`: renamed misleading `movingMaxDepth` parameter to `subtreeHeight` (it's a delta, not a max), dropped `(... - 0)` dead arithmetic, renamed `isSelfOrDescendant` → `isMovingNode` with WHY comment about why descendants are skipped via recursion.
   - Refactored `<NoteEditor>`: dropped the `dirty` `useEffect` (status flips inline in onChange handlers via `markUnsaved`); keydown listener now registers ONCE with the canonical `saveRef` pattern (fresh closure synced via a no-deps `useEffect`) instead of re-registering per keystroke.
   - Moved `flatNoteOf` / `findInTree` / `maxDepth` / `collectIds` from page + service into `src/domain/notes-tree.ts` — eliminates duplication between page and service layer.
8. `gh-pr` → pushed `issues/3`, opened PR [#6](https://github.com/chienchuanw/goal-tree/pull/6) against `dev`.

**Final pre-merge checks:** lint clean, typecheck clean, 26 new in-scope unit tests + 18 new integration tests pass, build clean. The 4 pre-existing dev failures noted in PR body.

**After merge (gh-archive this session):**

- Switched to `dev`; PR #6 merged via rebase (`b32d267` is the post-rebase tip of notes work).
- `openspec archive markdown-notes-hierarchy -y` → moved change to `openspec/changes/archive/2026-05-06-markdown-notes-hierarchy/` and created canonical `openspec/specs/notes/spec.md` (10 requirements). Committed as a separate `docs(openspec):` commit.
- README updated: marked notes feature shipped with PR link; marked entire MVP as complete in the Status section header; added canonical spec + archive entries to the Docs section. Committed `3ea7774`.
- This planning file + `task_plan.md` updated to reflect Phase 4 complete and MVP done.

**MVP complete: all three features shipped on `dev`.**

---

## 2026-05-06 — Issue #2 (Routines & daily status) executed end-to-end + archived

**Branch:** `issues/2` (now merged); archive landed on `dev` at `e59aa85`.

**What happened (chronological):**

1. `gh-dev` → branch `issues/2` linked to issue #2, based on `dev`.
2. `openspec-propose` → `routines-and-daily-status` change scaffolded; wrote `proposal.md`, `design.md` (10 design decisions D1–D10 covering cadence model, pure-domain `appliesOn`, status enum + `null`=unset, streak counts done+partial, 30-cell server-rendered heatmap, single `setRoutineStatusAction` with backfill guard, defense-in-depth via JOIN through `routines.userId`, page composition, Zod 4 schemas, test layering), `specs/routines/spec.md` (9 requirements with Given/When/Then), `tasks.md` (10 task groups). Committed `5a52c9a`; validates `--strict`.
3. `superpowers:writing-plans` → `docs/superpowers/plans/2026-05-06-routines-and-daily-status.md` with 11 tasks ~50 bite-sized steps. Committed `54efdea`.
4. `superpowers:subagent-driven-development` → 4 batched implementer dispatches (Tasks 1-3 domain+Zod / 4-6 services / 7-10 actions+UI+page / 11 verification). RED→GREEN split commits for TDD tasks (1, 2, 4, 5, 6) visible in `git log`.
5. One in-flight Next 16 fix surfaced during execution:
   - `fix(routines): rename actionFn→setStatusAction (Next 16 client-prop rule)` (`74b9459`) — same class of issue as PR #4's `onSuccess→onSuccessAction`. Caught by Next 16's TS plugin warning client-component prop functions for non-serializable values must end in `Action`.
6. `simplify` → 3 parallel reviewers (reuse / quality / efficiency). Applied 6 high/medium-confidence findings in `refactor(routines): simplify after review` (`4ea63e2`, -46 lines):
   - Extracted shared `requireUserId` to `src/lib/require-user-id.ts` (replaces 3 copies in goals + routines + routine_logs actions)
   - Exported `shiftDate` from `streak.ts`; deduped 30-day-since date math in `today.ts` and `routine_logs.ts`
   - `Promise.all` for the two queries in `listTodayRoutines` — cuts one serial RTT on the RSC hot path
   - `StatusCycleButton`: replaced 3 parallel `Record<string, ...>` lookup tables (keyed on stringified `null`) with one `CONFIG` keyed on a `Cell` sentinel union
   - Trimmed WHAT-comments in services; kept WHY (defense-in-depth note referencing openspec D7)
   - Deduped `cadenceType === 'weekdays'` check into single `isWeekdays` const
   - Deferred: `useEffect`-reset for stale-prop on `StatusCycleButton` — `react-hooks/set-state-in-effect` lint rule rejects setState in effect body, and the React-blessed alternative (set-state-during-render with prev-prop comparison) added more complexity than the marginal-value race fix justified
7. `gh-pr` → pushed `issues/2`, opened PR [#5](https://github.com/chienchuanw/goal-tree/pull/5) against `dev`.

**Final pre-merge checks:** lint clean, typecheck clean, 61/61 unit, 35/35 integration, build clean.

**After merge (gh-archive this session):**

- Switched to `dev`; PR #5 merged via rebase (`52cecc8` is the post-rebase tip of routines work). Local `issues/2` branch had already been auto-cleaned.
- `openspec archive routines-and-daily-status -y` → moved change to `openspec/changes/archive/2026-05-06-routines-and-daily-status/` and created canonical `openspec/specs/routines/spec.md` (9 requirements). Committed as a separate `docs(openspec):` commit.
- README updated: marked routines feature shipped with PR link; added canonical spec + archive entries to the Docs section. Committed `e59aa85`.
- This planning file + `task_plan.md` updated to reflect Phase 3 complete.

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
