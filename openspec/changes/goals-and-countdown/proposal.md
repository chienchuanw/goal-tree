## Why

The MVP exists to help the owner hit study deadlines. Until the Goals page ships, the central motivational mechanic — a deadline countdown for each active goal — does not exist in the running app. The Drizzle schema, Auth.js gating, Asia/Taipei domain helpers, and shadcn primitives are already in place from the foundation, so this change can land entirely on top of existing infrastructure without schema changes or new runtime dependencies.

## What Changes

- New page `/goals` (gated by Auth.js) that lists every `status='active'` goal for the signed-in user, ordered by `deadline_at ASC`. Many concurrent goals are supported.
- Each goal renders a countdown badge whose representation depends on time remaining:
  - `Nd` (whole calendar days, Asia/Taipei) when `daysUntil > 1`.
  - `Xh Ym` live ticker (60 s tick) when `daysUntil <= 1`.
  - `Overdue Nd` red badge when `daysUntil < 0`. Goal stays in the active list until manually archived (no auto-archive).
- New "Create goal" form: title (required), description (optional), deadline (date+time picker, default 23:59 Asia/Taipei). Validated by Zod at the server-action boundary.
- New "Archive" action on each goal that flips `status` from `active` to `archived` and stamps `archived_at`. Archived goals disappear from the list but remain queryable.
- New pure-domain functions in `src/domain/countdown.ts` for whole-day and hours/minutes calculations relative to Asia/Taipei.
- New service module `src/services/goals.ts` exposing `listActiveGoals`, `getGoal`, `createGoal`, and `archiveGoal`.
- New components under `src/components/goals/` (`GoalCard`, `HoursCountdown` client component, `CreateGoalForm`, `ArchiveGoalButton`).

## Capabilities

### New Capabilities
- `goals`: Active goals with deadline countdown, manual archive, and creation form. Covers the data flow from Drizzle through service actions to the RSC + client-component UI.

### Modified Capabilities
<!-- None — this is the first feature capability; foundation does not introduce one. -->

## Impact

- **Code**:
  - New: `app/(app)/goals/page.tsx` (replaces placeholder), `src/services/goals.ts`, `src/domain/countdown.ts`, `src/components/goals/{GoalCard,HoursCountdown,CreateGoalForm,ArchiveGoalButton}.tsx`, `src/lib/zod.ts` (or `src/lib/zod/goals.ts` — see design).
  - New tests: `tests/unit/domain/countdown.test.ts`, `tests/integration/services/goals.test.ts`, `tests/component/goals/HoursCountdown.test.tsx` (RTL).
- **APIs**: no public HTTP API. Internal server actions invoked from forms and buttons.
- **Dependencies**: no new packages. Existing Drizzle, Zod, Auth.js, shadcn (Button, Card, Input, Label) are sufficient. May add shadcn `dialog` and `textarea` primitives for the create form (`pnpm dlx shadcn@latest add dialog textarea`) — captured in tasks.
- **Data model**: none. The `goals` table already exists with the required columns, the `(user_id, status)` index, and the `goals_status_chk` CHECK constraint.
- **Auth**: every server action and query reads the session via `auth()` and scopes by `session.user.id`; no row from another user is reachable.
- **Performance**: a single Drizzle query per page load. The 60 s ticker for ≤1d goals runs only on those goals' client component instances.
- **Out of scope** (carried forward into deferred issues): editing existing goals, sub-goals/dependencies, overdue notifications, progress charts beyond the countdown.
