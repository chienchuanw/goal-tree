## Why

Goals give the app deadlines to count down to, but there is no daily-use surface yet — no place where the user actually marks progress each day. Routines & daily status is the second of three MVP features and turns goal-tree from a passive countdown into an active tracker. Without it, the user opens the app, sees countdowns, and has nothing to do.

The schema (`routines`, `routine_logs`) and the Asia/Taipei domain helpers (`todayInTaipei`, `weekdayInTaipei`, `isWithinBackfillWindow`) are already in place from the foundation, so this change is purely the feature surface on top of an existing data layer.

## What Changes

- New `/today` page (default landing after sign-in) listing routines whose cadence applies to today in Asia/Taipei.
- Tri-state status cycle button per routine: `unset → done → partial → skipped → unset`, persisted via a server action that respects a 2-day backfill window.
- Per-routine streak count (consecutive days from today backward where status ∈ {done, partial}) and a 30-day mini-heatmap rendered server-side.
- Cadence-aware filtering: routines with `cadence_type='daily'` show every day; routines with `cadence_type='weekdays'` show only on listed Taipei weekdays.
- Routine creation form (title, optional `goalId`, cadence radio + weekday checkboxes when applicable) and routine archival.
- Routines optionally group under a parent goal; goal-less routines render under "General".
- Defense-in-depth `userId` scoping in every repo function (`eq(table.userId, userId)` in WHERE clause, even though Auth.js + the proxy gate the routes).

No schema changes. No new dependencies.

## Capabilities

### New Capabilities

- `routines`: cadence-aware daily routine tracking with status logging, 2-day backfill, streak counting, and 30-day heatmap visualization.

### Modified Capabilities

(none — `goals` capability is unchanged)

## Impact

- **Affected code**:
  - `app/(app)/today/page.tsx` — replace placeholder with the real RSC list
  - `app/(app)/page.tsx` — root redirects authenticated users to `/today`
  - `src/services/routines.ts` (new) — routine repo functions
  - `src/services/routines.actions.ts` (new) — `'use server'` wrappers for create / archive
  - `src/services/routine_logs.ts` (new) — log repo functions
  - `src/services/routine_logs.actions.ts` (new) — `setRoutineStatusAction` server action
  - `src/domain/cadence.ts` (new) — `appliesOn(routine, dateYYYYMMDD): boolean`
  - `src/domain/streak.ts` (new) — `streakLength(logs, today)`, `build30DayHeatmap(logs, today)`
  - `src/lib/zod/routines.ts` (new) — `CreateRoutineSchema`, `SetRoutineStatusSchema`
  - `src/components/routines/` (new) — `RoutineRow`, `StatusCycleButton`, `Heatmap30`, `CreateRoutineForm`, `CreateRoutineDialog`, `ArchiveRoutineButton`
- **APIs**: three new server actions (`createRoutineAction`, `archiveRoutineAction`, `setRoutineStatusAction`).
- **Dependencies**: none new.
- **Data model**: none — `routines` and `routine_logs` already provisioned in the foundation with all CHECK constraints and the unique index on `(routine_id, log_date)`.
- **Tests**: new unit tests for `cadence.ts` and `streak.ts`; new integration tests for both service modules; new component test for `StatusCycleButton`.
