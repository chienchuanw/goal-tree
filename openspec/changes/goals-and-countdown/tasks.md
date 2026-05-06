## 1. Domain layer (pure, TDD)

- [ ] 1.1 Add failing unit test `tests/unit/domain/countdown.test.ts` covering `daysUntil`: positive (>1d), `daysUntil <= 1` (0 and 1), negative (overdue), midnight-crossing in Asia/Taipei (UTC instant just before/after Taipei midnight), and an explicit timezone parameter case
- [ ] 1.2 Add failing unit test `tests/unit/domain/countdown.test.ts` covering `hoursMinutesUntil`: 4h 23m remaining, exactly 0, and past-deadline (clamped to `{hours:0,minutes:0}`)
- [ ] 1.3 Verify both test files RED via `pnpm test:unit -- countdown` (module not found)
- [ ] 1.4 Implement `src/domain/countdown.ts` exporting `daysUntil(deadlineAt: Date, now: Date, tz?: string): number` and `hoursMinutesUntil(deadlineAt: Date, now: Date): { hours: number; minutes: number }`, reusing `todayInTaipei`/`TAIPEI_TZ` from `src/domain/taipei.ts` for calendar-day resolution
- [ ] 1.5 Verify GREEN via `pnpm test:unit -- countdown`
- [ ] 1.6 Commit: `test(domain): add failing countdown tests` then `feat(domain): add daysUntil + hoursMinutesUntil` (two commits to make the red→green visible in history)

## 2. Zod schemas

- [ ] 2.1 Create `src/lib/zod/goals.ts` exporting `CreateGoalSchema` (title 1–200 chars, optional description ≤2000 chars, deadline as ISO string parsed to `Date` and refined `> now()`)
- [ ] 2.2 Add unit test `tests/unit/lib/zod/goals.test.ts` covering: valid input parsed, empty title rejected, title >200 chars rejected, description >2000 chars rejected, past deadline rejected
- [ ] 2.3 Verify `pnpm test:unit -- goals` GREEN
- [ ] 2.4 Commit: `feat(lib/zod): add CreateGoalSchema with deadline-future refinement`

## 3. shadcn primitives

- [ ] 3.1 Add `dialog`, `textarea`, `badge` via `pnpm dlx shadcn@latest add dialog textarea badge`
- [ ] 3.2 Verify generated files land at `src/components/ui/{dialog,textarea,badge}.tsx`
- [ ] 3.3 Verify `pnpm typecheck` clean
- [ ] 3.4 Commit: `feat(ui): add shadcn dialog, textarea, badge primitives`

## 4. Service layer (integration TDD)

- [ ] 4.1 Add failing integration test `tests/integration/services/goals.test.ts` for `listActiveGoals(userId)`: returns empty array when none, returns rows ordered by `deadline_at ASC`, excludes `archived` and `completed`, excludes other users' rows
- [ ] 4.2 Add failing integration test for `getGoal(id, userId)`: returns the matching row for the owner, returns `null` (or undefined) when row belongs to a different user
- [ ] 4.3 Add failing integration test for `createGoal(input, userId)`: inserts an `active` row, returns the new row, rejects invalid input via Zod
- [ ] 4.4 Add failing integration test for `archiveGoal(id, userId)`: flips `status` to `'archived'` and stamps `archived_at`, is idempotent on already-archived rows, refuses to archive another user's goal
- [ ] 4.5 Verify all four RED via `pnpm test:integration -- goals` (module not found)
- [ ] 4.6 Implement `src/services/goals.ts` with `listActiveGoals`, `getGoal`, `createGoal`, `archiveGoal` — server actions use `'use server'` per Next 16 docs (consult `node_modules/next/dist/docs/01-app/`), every function takes explicit `userId`, and mutations call `revalidatePath('/goals')` after success
- [ ] 4.7 Verify GREEN via `pnpm test:integration -- goals`
- [ ] 4.8 Commit: `test(services): add failing goals service tests` then `feat(services): add goals queries + create/archive actions`

## 5. Page + components (RSC + minimal client)

- [ ] 5.1 Replace `app/(app)/goals/page.tsx` placeholder with an async RSC that calls `auth()` (asserts session), then `listActiveGoals(session.user.id)`, then renders the empty-state message OR a list of `<GoalCard>` plus a `<CreateGoalDialog>` trigger button
- [ ] 5.2 Create `src/components/goals/GoalCard.tsx` (RSC): renders title, description, archive button (server-action form), and either a static `Nd` `<Badge>` or `<HoursCountdown>` based on `daysUntil`
- [ ] 5.3 Create `src/components/goals/HoursCountdown.tsx` (`'use client'`): accepts `deadlineAt: string` (ISO), uses `setInterval(60_000)` to recompute via `hoursMinutesUntil`, renders `Xh Ym` (or `Overdue Nd` red badge if `daysUntil < 0`); cleans up the interval on unmount
- [ ] 5.4 Create `src/components/goals/CreateGoalDialog.tsx`: trigger button + shadcn `Dialog` containing `<CreateGoalForm>`
- [ ] 5.5 Create `src/components/goals/CreateGoalForm.tsx`: form with `Input` (title), `Textarea` (description), `Input type="datetime-local"` (deadline) defaulted to next-day 23:59 Asia/Taipei; `<form action={createGoal}>`; uses `useActionState` (Next 16/React 19) to surface validation errors
- [ ] 5.6 Create `src/components/goals/ArchiveGoalButton.tsx` (or inline in `GoalCard`): `<form action={archiveGoal.bind(null, id)}>` with a confirm step (small `<Dialog>` or simple confirm prompt — pick one; document choice)
- [ ] 5.7 Verify `pnpm typecheck` clean and `pnpm lint` clean
- [ ] 5.8 Commit: `feat(goals): add /goals page, GoalCard, HoursCountdown, create + archive UI`

## 6. Component test for the live ticker

- [ ] 6.1 Add `tests/component/goals/HoursCountdown.test.tsx` (RTL): mounts `<HoursCountdown>` with a fixed `deadlineAt`, asserts initial `Xh Ym` text, advances Vitest fake timers by 60 seconds, asserts the rendered text updates
- [ ] 6.2 Confirm test runs in the `unit` Vitest project (happy-dom env) — file path matches the project's include glob (`tests/unit/**` or rename appropriately under that prefix); if the foundation `vitest.config.mts` does not match `tests/component/**`, either move the test under `tests/unit/component/goals/` or extend the include in a follow-up
- [ ] 6.3 Verify GREEN via `pnpm test:unit -- HoursCountdown`
- [ ] 6.4 Commit: `test(goals): add HoursCountdown ticker render test`

## 7. Acceptance + cleanup

- [ ] 7.1 Manually walk the page in dev mode (`pnpm dev`) once GitHub OAuth + `.env.local` are configured locally: sign in, create a goal with a deadline 30 days out (renders `30d`), create one ≤1 day out (renders live `Xh Ym`), create one with a past deadline by editing the row in psql or via a temporary test path (renders `Overdue Nd` red), archive each
- [ ] 7.2 Verify the full check suite green: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build`
- [ ] 7.3 Update `README.md` if any developer-facing command changed (likely none for this change)
- [ ] 7.4 Commit any small fixups discovered during 7.1/7.2
- [ ] 7.5 Open PR via `gh-pr` with body referencing issue #1 and this openspec change id (`goals-and-countdown`)
- [ ] 7.6 After merge, archive the openspec change via `/openspec-archive-change` so `openspec/specs/goals/spec.md` becomes the canonical spec
