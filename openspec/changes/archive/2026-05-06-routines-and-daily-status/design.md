## Context

Foundation provides `routines` and `routine_logs` tables with all CHECK constraints (`cadence_type IN ('daily','weekdays')`, `weekdays` array length 1–7 when applicable, `routine_logs.status IN ('done','partial','skipped')`, unique `(routine_id, log_date)`). Asia/Taipei domain helpers (`todayInTaipei`, `weekdayInTaipei`, `isWithinBackfillWindow`) already exist in `src/domain/taipei.ts`. The goals feature (shipped via PR #4) sets the conventions: pure domain in `src/domain/`, services orchestrate db + domain, `<feature>.actions.ts` for `'use server'` wrappers, components in `src/components/<feature>/`, defense-in-depth `userId` scoping in every WHERE clause, BDD-style describe/it nesting, `db: DbOrTx = defaultDb` injection.

Single user, GitHub-OAuth gated. All calendar math in Asia/Taipei (UTC+8, no DST).

## Goals / Non-Goals

**Goals:**

- `/today` is the daily-use surface — open the app, see what applies today, tap to log.
- Status logging is one tap, cyclic, immediately persisted (server action + `revalidatePath('/today')`).
- 2-day backfill so the user can correct yesterday or the day before; nothing older.
- Streak + 30-day heatmap give immediate feedback without leaving the page.
- Cadence model is small enough to reason about (daily / specific weekdays); no recurrence engine.

**Non-Goals:**

- Full RRULE / iCal recurrence (monthly, "every 3rd Tuesday", etc.) — out of MVP.
- Reminders / push notifications — out of MVP.
- Editing a routine's cadence after creation — out of MVP (delete + recreate).
- Per-routine analytics beyond the 30-day heatmap — out of MVP.
- Streak rewards / achievements — out of MVP.
- Free-form journaling on a log entry — only optional `note` field, no rich UI in MVP.

## Decisions

### D1: Cadence model — `cadence_type` enum + `weekdays smallint[]`

`cadence_type` is `'daily'` or `'weekdays'`. When `'weekdays'`, `weekdays` holds an array of 0–6 (Sun–Sat, matching JS `Date#getDay()` and the existing `weekdayInTaipei()` return). The schema CHECK constraint already enforces array length 1–7 when `cadence_type='weekdays'`.

**Rationale:** Postgres array beats a bitmask for queryability (`5 = ANY(weekdays)`), debuggability (you can read `{1,3,5}` in psql and know it's MWF), and Drizzle ergonomics (no manual bit-twiddling). The `cadence_type` column makes "daily" trivially fast — no need to materialize a 7-element array for the common case.

**Alternatives:** (a) bitmask `smallint` — denser but unreadable in psql; (b) one row per weekday in a join table — overkill for 1–7 values.

### D2: `appliesOn` is pure and date-driven

`appliesOn(routine: { cadenceType, weekdays }, date: string /* YYYY-MM-DD */): boolean` lives in `src/domain/cadence.ts`. It computes the weekday of `date` interpreted as Taipei midnight, then returns `true` for daily or `weekdays.includes(weekday)`.

**Rationale:** The page passes `today = todayInTaipei()` once into the query layer; pure-domain `appliesOn` is unit-testable without DB and without freezing time.

### D3: Status enum — `'done' | 'partial' | 'skipped'`, plus `null` (no row) for "unset"

`routine_logs.status` is one of three values (CHECK enforces). "Unset" is the absence of a row for `(routineId, logDate)`. The cycle button steps through `unset → done → partial → skipped → unset`; the fourth step deletes the existing row rather than writing a fourth value.

**Rationale:** Keeps the enum tight and the heatmap legible (3 colors + neutral). `setRoutineStatus(routineId, date, null)` is semantically "I changed my mind; pretend I never logged this" and matches the unique-index constraint perfectly (delete or upsert one row, never two states for the same day).

### D4: Streak counts `done` and `partial`, not `skipped`

`streakLength(logs, today, tz)` walks back from `today` and counts days where status ∈ {`done`, `partial`}. It stops at the first day that is `skipped`, missing, or older than the oldest log. If `today` itself is `skipped`/missing, the streak is `0` (today breaks the streak rather than starting at yesterday — keeps the number "honest" for daily routines and avoids the user-confusion of seeing "streak: 5" while today is unmarked).

**Rationale:** Partial credit feels right ("I did 10 minutes of the 30 I planned" is still showing up). Skipped explicitly says "no" so it must break the streak. The "today must be marked" rule eliminates the off-by-one debate.

For weekday routines, only days where `appliesOn(routine, date)` is true count — non-applicable days are transparent (don't break the streak, don't extend it).

### D5: Heatmap is 30 cells, server-rendered

`build30DayHeatmap(logs, today, tz)` returns a fixed `Array<{ date: string; status: 'done'|'partial'|'skipped'|'none'|'na' }>` of length 30, oldest → newest. `'na'` (not applicable) means cadence didn't apply that day; `'none'` means it applied but was unmarked. Renders as 30 colored squares from a single RSC pass — no client tick or interaction.

**Rationale:** 30 days fits a row at small sizes and is the smallest window that shows weekly cadence visually. Server-rendered means no flicker, no client JS for the visualization.

### D6: Status mutation = `setRoutineStatusAction(routineId, date, status | null)`

One server action, three jobs: insert when no row exists, update when one does, delete when `status === null`. Wraps in a transaction so the read-then-write race is impossible. Calls `revalidatePath('/today')` on success. Validates inputs with `SetRoutineStatusSchema` (Zod).

**Backfill guard:** action calls `isWithinBackfillWindow(date)` before touching the DB. Reject with a typed error result if the date is older than 2 days or in the future. Future dates rejected categorically (the helper already does this).

**Rationale:** One action keeps the client side simple (one cycle button → one call). The transaction prevents lost-update races on rapid taps. The backfill guard is in the server layer — never trust the client.

### D7: Defense-in-depth — every repo function takes `userId` and joins through `routines`

`routine_logs` has no `user_id` column, but every query the user can issue passes through `routines` (FK with `ON DELETE CASCADE`). Repo functions for `routine_logs` REQUIRE a `userId` parameter and add `eq(routines.userId, userId)` in the JOIN's ON clause (or in the inner subquery). Cross-user calls match zero rows and silently no-op — same pattern as `archiveGoal`.

**Rationale:** Auth.js + the proxy gate the routes, but a bug in route handling shouldn't be the only thing standing between the user and someone else's data.

### D8: Page composition

`app/(app)/today/page.tsx` is an async RSC with `export const dynamic = 'force-dynamic'`. It calls `auth()`, then `listTodayRoutines(session.user.id, todayInTaipei())`, then renders. Sub-components:

- `RoutinesGroupedByGoal` (RSC) — groups by `goalId` with the goal title as a section header; goal-less routines under "General".
- `RoutineRow` (RSC by default) — title, current status, streak, heatmap. Wraps `<StatusCycleButton>` (client) and `<Heatmap30>` (RSC).
- `StatusCycleButton` (client) — `'use client'`, holds the optimistic state, calls `setRoutineStatusAction`. Uses React 19 `useTransition` for the pending state.
- `CreateRoutineForm` (client) — `useActionState`, conditional weekday checkboxes when `cadence_type === 'weekdays'`. Wrapped in `<CreateRoutineDialog>` mirroring goals.

Root `app/page.tsx` (or `app/(app)/page.tsx` depending on current scaffold) redirects authenticated users to `/today` instead of `/goals` going forward.

### D9: Zod schemas live in `src/lib/zod/routines.ts`

```ts
export const CreateRoutineSchema = z.object({
  title: z.string().min(1).max(200),
  goalId: z.uuid().optional().nullable(),
  cadenceType: z.enum(['daily', 'weekdays']),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
}).refine(
  (v) => v.cadenceType === 'daily' ? !v.weekdays?.length : !!v.weekdays?.length,
  { message: 'weekdays required when cadenceType=weekdays', path: ['weekdays'] },
);

export const SetRoutineStatusSchema = z.object({
  routineId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(['done', 'partial', 'skipped']).nullable(),
});
```

**Rationale:** Mirrors `src/lib/zod/goals.ts` precedent. Refinement on the discriminated cadence avoids a tagged union for two cases.

### D10: Tests

- **Unit (`tests/unit/`)**:
  - `domain/cadence.test.ts` — `appliesOn` for daily, each weekday, missing arrays, future dates.
  - `domain/streak.test.ts` — `streakLength` for empty logs, today-only, broken-by-skip, broken-by-gap, weekday-routine-with-na-days; `build30DayHeatmap` for fill order, 'na' classification, 'none' classification.
  - `lib/zod/routines.test.ts` — `CreateRoutineSchema` (daily, weekdays valid, weekdays missing for cadence='weekdays', invalid weekday number), `SetRoutineStatusSchema` (all four statuses including `null`, bad date format, bad uuid).
  - `components/routines/StatusCycleButton.test.tsx` — RTL with mocked action; click cycles `unset→done→partial→skipped→unset`.
- **Integration (`tests/integration/`)**:
  - `services/routines.test.ts` — `createRoutine`, `listActiveRoutines`, `archiveRoutine` (idempotent + cross-user no-op).
  - `services/routine_logs.test.ts` — `setRoutineStatus` upsert, update, delete-on-null, backfill rejection (>2 days), future rejection, cross-user no-op (verifies the JOIN-through-`routines` defense-in-depth).
  - `services/today.test.ts` (or fold into routines) — `listTodayRoutines` with mixed cadences and existing logs left-joined for today.

All wrapped in `withRollback` with `seedUser` fixtures.

## Risks / Trade-offs

- **[Risk] Heatmap accuracy across DST boundaries.** → Taipei has no DST, so the 30 cells are exactly 30 calendar days. If we ever support per-user TZ, this needs revisiting (logged in `findings.md`).
- **[Risk] Tap latency on slow networks makes cycling feel laggy.** → Optimistic update inside `useTransition` so the button reflects the next state immediately; rolls back if the action errors.
- **[Risk] Weekday array semantics drift from JS `getDay()` (0=Sun) to ISO (1=Mon).** → Standardize on JS `getDay()` everywhere (matches `weekdayInTaipei` return). UI labels show "Mon Tue ..." but always emit `1, 2, ...` consistently. Documented in `cadence.ts` doc comment.
- **[Risk] Streak calculation cost grows with log count.** → Bounded: streak walk stops at the first non-`done|partial` day. 30-day heatmap touches at most 30 logs. No table scans expected; the `routine_logs_routine_date_idx` covers it.
- **[Trade-off] No cadence editing means duplicate routines if the user changes their mind.** → Acceptable for MVP; archive + recreate is one extra step.

## Migration Plan

No data migration needed. New page (`/today` already exists as placeholder, replaced in this change). Default landing page changes from `/goals` to `/today` for authenticated users — purely client-perceivable, no data touched.

Rollback: revert the PR. Schema is unchanged so no down-migration needed.

## Open Questions

- Should the heatmap show the routine's goal-color (when grouped under a goal)? — Deferred; uniform palette in MVP.
- Should `setRoutineStatus` accept an optional `note` in MVP? — Schema supports it but UI doesn't; out of MVP.
