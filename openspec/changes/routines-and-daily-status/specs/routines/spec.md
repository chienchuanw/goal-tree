## ADDED Requirements

### Requirement: Today page lists applicable routines

The system SHALL render `/today` as an RSC that lists every non-archived routine belonging to the signed-in user whose cadence applies to the current calendar day in Asia/Taipei. Routines whose cadence does not apply today MUST NOT appear.

#### Scenario: Daily routine appears every day

- **WHEN** an authenticated user with a routine `{cadenceType: 'daily'}` loads `/today`
- **THEN** the routine appears in the list regardless of the Taipei weekday

#### Scenario: Weekday routine appears only on listed weekdays

- **WHEN** an authenticated user with a routine `{cadenceType: 'weekdays', weekdays: [1, 3, 5]}` loads `/today` and today is a Wednesday in Taipei
- **THEN** the routine appears in the list

#### Scenario: Weekday routine hidden on non-listed weekdays

- **WHEN** an authenticated user with a routine `{cadenceType: 'weekdays', weekdays: [1, 3, 5]}` loads `/today` and today is a Sunday in Taipei
- **THEN** the routine does NOT appear in the list

#### Scenario: Archived routine never appears

- **WHEN** an authenticated user with a routine whose `archivedAt` is non-null loads `/today`
- **THEN** the routine does NOT appear regardless of cadence

#### Scenario: Other users' routines never appear

- **WHEN** an authenticated user A loads `/today` and user B has matching routines
- **THEN** none of user B's routines appear in user A's list

### Requirement: Routines group by goal

The system SHALL group routines on `/today` by their parent goal title. Routines with `goalId = null` MUST be grouped under the heading "General".

#### Scenario: Routines grouped under their goal

- **WHEN** the user has two routines linked to goal "Ship MVP" and one with no goal
- **THEN** `/today` shows a "Ship MVP" section with the two routines and a "General" section with the third

### Requirement: Status cycle button persists state

The system SHALL render a status cycle button on each `RoutineRow` that visibly steps through the states `unset → done → partial → skipped → unset` on each click. Each click MUST invoke `setRoutineStatusAction(routineId, todayInTaipei(), nextStatus)` (or `null` when cycling back to `unset`) and persist the result before the next render commits.

#### Scenario: First click marks done

- **WHEN** the routine has no log for today and the user clicks the status button
- **THEN** a `routine_logs` row is created with `status='done'` for `(routineId, today)` and the button reflects "done"

#### Scenario: Second click marks partial

- **WHEN** the routine has a log for today with `status='done'` and the user clicks the status button
- **THEN** the existing row is updated to `status='partial'` and the button reflects "partial"

#### Scenario: Fourth click clears the log

- **WHEN** the routine has a log for today with `status='skipped'` and the user clicks the status button
- **THEN** the row for `(routineId, today)` is deleted and the button reflects "unset"

### Requirement: Backfill window enforced server-side

The system SHALL allow `setRoutineStatusAction` to mutate `routine_logs` only when the target `date` is within `[todayInTaipei() - 2, todayInTaipei()]`. Future dates and dates older than 2 calendar days in Taipei MUST be rejected with a typed validation error and MUST NOT mutate the database.

#### Scenario: Today succeeds

- **WHEN** the action is called with `date = todayInTaipei()` and a valid status
- **THEN** the log row is upserted

#### Scenario: Two days ago succeeds

- **WHEN** the action is called with `date` two calendar days before today in Taipei
- **THEN** the log row is upserted

#### Scenario: Three days ago is rejected

- **WHEN** the action is called with `date` three calendar days before today in Taipei
- **THEN** the action returns an error result and `routine_logs` is unchanged

#### Scenario: Future date is rejected

- **WHEN** the action is called with `date` after today in Taipei
- **THEN** the action returns an error result and `routine_logs` is unchanged

### Requirement: Streak count shown per routine

The system SHALL display a current streak count for each routine on `/today`. The streak SHALL count consecutive applicable Taipei days from today backward where the routine's status is `done` or `partial`. A `skipped` status, an unmarked applicable day, or a day with no log MUST break the streak.

#### Scenario: Today done with two prior done days

- **WHEN** the routine has logs `[today: done, today-1: done, today-2: done]` and is daily
- **THEN** the displayed streak is 3

#### Scenario: Today unmarked breaks the streak

- **WHEN** the routine has logs `[today-1: done, today-2: done]` and is daily and today has no log
- **THEN** the displayed streak is 0

#### Scenario: Skipped breaks the streak

- **WHEN** the routine has logs `[today: done, today-1: skipped, today-2: done]` and is daily
- **THEN** the displayed streak is 1

#### Scenario: Weekday routine ignores non-applicable days

- **WHEN** the routine is `{cadenceType: 'weekdays', weekdays: [1, 3, 5]}` and the most recent applicable Mon/Wed/Fri days all have `status='done'`
- **THEN** non-applicable Sun/Tue/Thu/Sat days do NOT break the streak

### Requirement: 30-day heatmap rendered server-side

The system SHALL render a 30-cell mini-heatmap for each routine on `/today`, oldest cell on the left and today on the right. Each cell MUST be classified as `done`, `partial`, `skipped`, `none` (cadence applied but no log), or `na` (cadence did not apply). The heatmap MUST be computed on the server with no client-side data fetching.

#### Scenario: Heatmap reflects mixed history

- **WHEN** the routine is daily with mixed logs over the last 30 days
- **THEN** each cell shows the corresponding status or `none` for the unmarked applicable days

#### Scenario: Weekday routine marks non-applicable days as `na`

- **WHEN** the routine is `{cadenceType: 'weekdays', weekdays: [1, 3, 5]}`
- **THEN** the cells for non-Mon/Wed/Fri days are classified `na`

### Requirement: Routine creation form

The system SHALL provide a form on `/today` that creates a routine with `title`, optional `goalId`, `cadenceType` (`daily` or `weekdays`), and `weekdays` (required when `cadenceType='weekdays'`). The form MUST validate input via Zod before invoking `createRoutineAction`.

#### Scenario: Daily routine created

- **WHEN** the user submits `{title: 'Read 30 min', cadenceType: 'daily'}`
- **THEN** a `routines` row is inserted with the user's `userId`, `cadenceType='daily'`, and `weekdays=null`

#### Scenario: Weekday routine created

- **WHEN** the user submits `{title: 'Run', cadenceType: 'weekdays', weekdays: [1, 3, 5]}`
- **THEN** a `routines` row is inserted with `weekdays=[1, 3, 5]`

#### Scenario: Weekday routine without weekdays rejected

- **WHEN** the user submits `{title: 'Run', cadenceType: 'weekdays'}` with no weekdays
- **THEN** the form shows a validation error and no row is inserted

#### Scenario: Empty title rejected

- **WHEN** the user submits a routine with empty title
- **THEN** the form shows a validation error and no row is inserted

### Requirement: Routine archival is idempotent and user-scoped

The system SHALL provide `archiveRoutineAction(routineId)` that sets the routine's `archivedAt` to the current timestamp. The action MUST be idempotent (calling on an already-archived routine is a no-op) and MUST NOT affect routines belonging to other users.

#### Scenario: Active routine archived

- **WHEN** the owner calls `archiveRoutineAction(id)` on an active routine
- **THEN** `archivedAt` is set to `now()` and the routine no longer appears on `/today`

#### Scenario: Already-archived routine is a no-op

- **WHEN** the owner calls `archiveRoutineAction(id)` on a routine whose `archivedAt` is already non-null
- **THEN** the database is unchanged (no rewrite of `archivedAt`) and the action does not error

#### Scenario: Cross-user call is a silent no-op

- **WHEN** user B calls `archiveRoutineAction(id)` on user A's routine
- **THEN** the database is unchanged and the action does not error or leak information

### Requirement: Default landing page is `/today`

The system SHALL redirect authenticated users from the application root to `/today` as the default landing page after sign-in.

#### Scenario: Authenticated user lands on /today

- **WHEN** an authenticated user navigates to `/`
- **THEN** the user is redirected to `/today`
