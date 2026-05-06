# Tasks

## 1. Domain: cadence

- [ ] 1.1 Write failing unit tests for `appliesOn(routine, date)` (`tests/unit/domain/cadence.test.ts`) covering daily, each weekday, weekday match/miss, and edge cases
- [ ] 1.2 Implement `src/domain/cadence.ts` with `appliesOn(routine: { cadenceType: 'daily' | 'weekdays'; weekdays: number[] | null }, date: string): boolean`
- [ ] 1.3 Run unit tests and confirm green

## 2. Domain: streak + heatmap

- [ ] 2.1 Write failing unit tests for `streakLength(logs, today, applies)` covering empty, today-done, broken-by-skip, broken-by-gap, weekday-routine-with-na-days
- [ ] 2.2 Write failing unit tests for `build30DayHeatmap(logs, today, applies)` covering fill order (oldest→newest), `na`/`none` classification, mixed status
- [ ] 2.3 Implement `src/domain/streak.ts` with both functions; reuse `appliesOn` from `cadence.ts` for the `applies` predicate
- [ ] 2.4 Run unit tests and confirm green

## 3. Zod schemas

- [ ] 3.1 Write failing unit tests for `CreateRoutineSchema` (daily ok, weekdays ok, weekdays-without-array rejected, empty title rejected, invalid weekday number rejected) at `tests/unit/lib/zod/routines.test.ts`
- [ ] 3.2 Write failing unit tests for `SetRoutineStatusSchema` (each of the four status values including null, bad date format, bad uuid)
- [ ] 3.3 Implement `src/lib/zod/routines.ts` with both schemas using Zod 4 idioms (`z.iso.date()`, `z.uuid()`, `z.enum(...)`)
- [ ] 3.4 Run unit tests and confirm green

## 4. Service: routines repo

- [ ] 4.1 Write failing integration test for `createRoutine` (daily + weekdays + null goalId) at `tests/integration/services/routines.test.ts`, using `withRollback` and `seedUser`
- [ ] 4.2 Write failing integration test for `listActiveRoutines(userId)` (returns user's non-archived routines, excludes archived, excludes other users)
- [ ] 4.3 Write failing integration test for `archiveRoutine` (idempotent on already-archived, silent no-op on cross-user)
- [ ] 4.4 Implement `src/services/routines.ts` with `createRoutine`, `listActiveRoutines`, `archiveRoutine` — all take explicit `userId` and include it in WHERE
- [ ] 4.5 Run integration tests and confirm green

## 5. Service: routine_logs repo

- [ ] 5.1 Write failing integration test for `setRoutineStatus` upsert (insert new), update (overwrite existing), delete (status=null)
- [ ] 5.2 Write failing integration test for backfill: today, today-2 succeed; today-3 and future rejected
- [ ] 5.3 Write failing integration test for cross-user no-op on `setRoutineStatus` (passes userId not owning the routine)
- [ ] 5.4 Write failing integration test for `listLogsForLast30Days(routineId, userId, today)` returning logs in date order
- [ ] 5.5 Implement `src/services/routine_logs.ts` with `setRoutineStatus`, `listLogsForLast30Days`. All scoped via JOIN through `routines.userId = userId`. Use a transaction for the upsert/delete branch
- [ ] 5.6 Run integration tests and confirm green

## 6. Service: today aggregator

- [ ] 6.1 Write failing integration test for `listTodayRoutines(userId, today)` returning per-routine `{ routine, todayLog, last30Logs, streak }` shape
- [ ] 6.2 Implement `listTodayRoutines` (filter by `appliesOn`, left-join logs for today, fetch last 30 logs per routine, compute streak via `streakLength`)
- [ ] 6.3 Run integration test and confirm green

## 7. Server actions

- [ ] 7.1 Implement `src/services/routines.actions.ts` with `'use server'` directive: `createRoutineAction(prevState, formData)` and `archiveRoutineAction(id)`. Both call `auth()` and `revalidatePath('/today')`
- [ ] 7.2 Implement `src/services/routine_logs.actions.ts` with `setRoutineStatusAction(routineId, date, status | null)`. Validates with `SetRoutineStatusSchema` and `isWithinBackfillWindow`; calls `revalidatePath('/today')`
- [ ] 7.3 Add typecheck to confirm `'use server'` exports are serializable

## 8. Components

- [ ] 8.1 Write failing component test for `StatusCycleButton` (RTL): cycles `unset → done → partial → skipped → unset` on click, calls action mock with the right next status. Test file at `tests/unit/components/routines/StatusCycleButton.test.tsx`
- [ ] 8.2 Implement `src/components/routines/StatusCycleButton.tsx` (`'use client'`) with `useTransition` for pending state and optimistic local state
- [ ] 8.3 Implement `src/components/routines/Heatmap30.tsx` (RSC): renders 30 colored cells from `Array<{date, status}>` using Tailwind classes
- [ ] 8.4 Implement `src/components/routines/RoutineRow.tsx` (RSC): title + StatusCycleButton + streak number + Heatmap30
- [ ] 8.5 Implement `src/components/routines/RoutinesGroupedByGoal.tsx` (RSC): groups rows under goal title or "General"
- [ ] 8.6 Implement `src/components/routines/CreateRoutineForm.tsx` (`'use client'`): `useActionState`, conditional weekday checkboxes when `cadenceType='weekdays'`, `useEffect` for success callback (NOT render-body) per React 19 / project convention
- [ ] 8.7 Implement `src/components/routines/CreateRoutineDialog.tsx` mirroring `goals/CreateGoalDialog.tsx` (uses `<DialogTrigger render={<Button />}>` per `@base-ui/react`, NOT `asChild`)
- [ ] 8.8 Implement `src/components/routines/ArchiveRoutineButton.tsx` (`'use client'`): confirm + call `archiveRoutineAction`

## 9. Page: /today and root redirect

- [ ] 9.1 Replace `app/(app)/today/page.tsx` with async RSC: `export const dynamic = 'force-dynamic'`, calls `auth()` + `listTodayRoutines(session.user.id, todayInTaipei())`, renders empty state or `<RoutinesGroupedByGoal>` + `<CreateRoutineDialog>`
- [ ] 9.2 Update `app/(app)/page.tsx` (or wherever the authenticated root lives) to redirect to `/today` instead of `/goals`
- [ ] 9.3 Manual smoke check: lint clean, typecheck clean, dev server renders `/today` without errors

## 10. Final checks

- [ ] 10.1 Run `pnpm lint` — clean
- [ ] 10.2 Run `pnpm typecheck` — clean
- [ ] 10.3 Run `pnpm test:unit` — all green
- [ ] 10.4 Run `pnpm test:integration` — all green
- [ ] 10.5 Run `pnpm build` — clean
- [ ] 10.6 `openspec validate routines-and-daily-status --strict` — passes
