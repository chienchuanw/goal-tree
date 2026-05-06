## ADDED Requirements

### Requirement: Active goals list

The `/goals` page SHALL display every `goals` row owned by the signed-in user where `status = 'active'`, ordered by `deadline_at` ascending. Goals owned by other users MUST NOT be visible.

#### Scenario: Signed-in user with three active goals across two users

- **WHEN** user A is signed in and three `active` goals exist for user A and two `active` goals exist for user B
- **THEN** `/goals` renders exactly user A's three goals in `deadline_at ASC` order, and user B's goals are absent

#### Scenario: Signed-in user with no active goals

- **WHEN** user A is signed in and no goals exist for user A
- **THEN** `/goals` renders an empty-state message (e.g., "No active goals yet") and a visible "New goal" trigger

#### Scenario: Archived and completed goals are excluded

- **WHEN** user A has goals with statuses `active`, `completed`, and `archived`
- **THEN** only the `active` goals appear in the list

### Requirement: Countdown badge representation

Each goal in the active list SHALL render a countdown badge whose textual form depends on `daysUntil(deadlineAt, now, 'Asia/Taipei')`:

- `Nd` (whole calendar days, e.g., `23d`) when `daysUntil > 1`.
- `Xh Ym` updated every 60 seconds (live ticker on the client) when `daysUntil <= 1` AND `daysUntil >= 0`.
- `Overdue Nd` rendered in a red/destructive variant when `daysUntil < 0`.

#### Scenario: Goal 23 days away

- **WHEN** a goal has `deadline_at` set 23 calendar days ahead in Asia/Taipei
- **THEN** the badge renders `23d`

#### Scenario: Goal 4 hours away

- **WHEN** a goal has `deadline_at` set 4 hours ahead and `daysUntil <= 1`
- **THEN** the badge renders an `Xh Ym` string and re-renders within 60 seconds when wall-clock time advances

#### Scenario: Goal past its deadline

- **WHEN** a goal has `deadline_at` 2 calendar days in the past in Asia/Taipei and `status = 'active'`
- **THEN** the badge renders `Overdue 2d` in the destructive visual variant
- **AND** the goal remains in the list (it is NOT auto-archived)

### Requirement: Asia/Taipei calendar-day math

The pure domain function `daysUntil(deadlineAt, now, tz)` SHALL return the difference between the calendar day of `deadlineAt` and the calendar day of `now` in the given IANA timezone (default `'Asia/Taipei'`), as a signed integer.

#### Scenario: Crossing midnight in Asia/Taipei

- **WHEN** `now` is `2026-05-04T15:30:00Z` (which is `2026-05-04 23:30 +08:00`) and `deadlineAt` is `2026-05-04T16:30:00Z` (which is `2026-05-05 00:30 +08:00`)
- **THEN** `daysUntil(deadlineAt, now, 'Asia/Taipei')` returns `1`

#### Scenario: Same calendar day

- **WHEN** `now` and `deadlineAt` fall on the same Asia/Taipei calendar day
- **THEN** `daysUntil` returns `0`

#### Scenario: Past deadline

- **WHEN** `deadlineAt` resolves to an earlier Asia/Taipei calendar day than `now`
- **THEN** `daysUntil` returns a negative integer equal to the calendar-day delta

### Requirement: Hours/minutes ticker math

The pure domain function `hoursMinutesUntil(deadlineAt, now)` SHALL return `{ hours: number; minutes: number }` representing wall-clock time remaining, with both fields clamped to non-negative when `deadlineAt <= now`.

#### Scenario: 4 hours 23 minutes remaining

- **WHEN** `deadlineAt - now` equals 4 hours and 23 minutes
- **THEN** the function returns `{ hours: 4, minutes: 23 }`

#### Scenario: Past deadline

- **WHEN** `deadlineAt < now`
- **THEN** the function returns `{ hours: 0, minutes: 0 }`

### Requirement: Create goal action

A signed-in user SHALL be able to create a new goal via a server action `createGoal(input)` that validates input with Zod and inserts a row scoped to the user's `id`. On success the page SHALL re-render the updated list.

#### Scenario: Valid input creates an active goal

- **WHEN** user A submits the create form with title `"Pass JLPT N3"`, blank description, and a deadline 30 days in the future
- **THEN** a new row is inserted with `user_id = userA.id`, `status = 'active'`, `archived_at = NULL`, and the supplied title and `deadline_at`
- **AND** the new goal appears in the list

#### Scenario: Title required

- **WHEN** user A submits the create form with an empty title
- **THEN** the action throws a Zod validation error and no row is inserted

#### Scenario: Deadline in the past rejected

- **WHEN** user A submits the create form with a `deadline_at` already in the past
- **THEN** the action throws a Zod validation error and no row is inserted

#### Scenario: Title length capped

- **WHEN** user A submits a title longer than 200 characters
- **THEN** the action throws a Zod validation error

### Requirement: Archive goal action

A signed-in user SHALL be able to archive one of their own goals via a server action `archiveGoal(id)` that flips `status` to `'archived'` and stamps `archived_at = now()`. The action MUST be idempotent and MUST NOT allow archiving another user's goal.

#### Scenario: Archive removes from active list

- **WHEN** user A invokes `archiveGoal` on one of their `active` goals
- **THEN** that row's `status` becomes `'archived'`, `archived_at` is non-null, and the goal disappears from `/goals`

#### Scenario: Archiving an already-archived goal is a no-op

- **WHEN** user A invokes `archiveGoal` on a goal whose `status` is already `'archived'`
- **THEN** the action completes without error and the row is unchanged (or `archived_at` is left untouched)

#### Scenario: Cannot archive another user's goal

- **WHEN** user A invokes `archiveGoal` with the `id` of a goal owned by user B
- **THEN** the action MUST NOT mutate user B's goal and MUST return an unauthorized result (or throw)

### Requirement: Authentication required

Both the page render and every server action SHALL require an authenticated session. Unauthenticated requests MUST be redirected to `/signin` (handled by `proxy.ts` and the `(app)/layout.tsx` guard) and MUST NOT execute any DB query.

#### Scenario: Unauthenticated visit to /goals

- **WHEN** an unauthenticated browser requests `/goals`
- **THEN** the response is a redirect to `/signin` and no `goals` row is read

#### Scenario: Server action invoked without session

- **WHEN** `createGoal` or `archiveGoal` is invoked with no current session
- **THEN** the action throws (or returns an error result) before any DB mutation

### Requirement: Tests follow TDD and BDD-style nesting

Every domain function SHALL have a failing-first unit test. Every service action SHALL have a failing-first integration test against real Postgres using the `withRollback` helper. Tests SHALL use BDD-style `describe('Given …', () => describe('When …', () => it('Then …', …)))` nesting consistent with `tests/unit/domain/taipei.test.ts`.

#### Scenario: Domain function added without prior failing test

- **WHEN** a code reviewer inspects the commit history for `src/domain/countdown.ts`
- **THEN** the test commit precedes the implementation commit (TDD red → green discipline)

#### Scenario: Service test bypasses real DB

- **WHEN** a code reviewer inspects `tests/integration/services/goals.test.ts`
- **THEN** every test invokes `withRollback` so the schema is never left dirty
