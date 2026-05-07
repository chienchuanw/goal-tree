# Quantity Routines — Design Spec

**Date:** 2026-05-08
**Status:** Draft, awaiting user review
**Motivation:** Today, routines are binary (done / partial / skipped per day). Some routines — exercise, reading, water intake — are naturally quantitative: you log minutes or units and want to see frequency and volume over time. This spec adds a "quantity" routine kind and a 30-day bar chart on `/today` while keeping existing check routines unchanged.

## Goals

- Support routines whose daily progress is a number (e.g. 30 min of exercise) with an optional daily target.
- Render a 30-day bar chart on `/today` for quantity routines, matching the visual rhythm of the existing `Heatmap30`.
- Reuse existing streak logic without changes.
- Zero behavior change for existing check routines.

## Non-goals (v1)

- Multiple sessions per day (only aggregated per-day totals).
- Unit conversion (minutes vs. hours, km vs. miles).
- Time windows other than 30 days.
- Importing from external health apps.
- Backfilling/recomputing historical `status` when `daily_target` changes after the fact.

## Schema

### `routines` — new columns

| Column         | Type             | Nullable | Notes                                                      |
| -------------- | ---------------- | -------- | ---------------------------------------------------------- |
| `kind`         | `text NOT NULL`  | no       | Default `'check'`. Check constraint: `IN ('check','quantity')`. |
| `unit`         | `text`           | yes      | Required when `kind='quantity'`, must be null when `'check'`. |
| `daily_target` | `integer`        | yes      | Optional. Positive integer. Only meaningful for quantity routines. |

Constraints (added in same migration):
- `routines_kind_chk`: `kind IN ('check','quantity')`
- `routines_quantity_unit_chk`: `(kind = 'check' AND unit IS NULL) OR (kind = 'quantity' AND unit IS NOT NULL)`
- `routines_daily_target_chk`: `daily_target IS NULL OR daily_target > 0`

### `routine_logs` — new column

| Column  | Type      | Nullable | Notes                                                          |
| ------- | --------- | -------- | -------------------------------------------------------------- |
| `value` | `integer` | yes      | Required when parent routine is `kind='quantity'`, null for check. |

Cross-table invariant (parent routine kind → log shape) is enforced in the service layer rather than via a trigger — keeps the schema simple, accepts that direct SQL writes could violate it.

The existing unique index `(routine_id, log_date)` is preserved. Quantity logs maintain one row per day; the row's `value` is incremented in place.

### `status` field reuse

`routine_logs.status` stays. For quantity logs it is **derived at write time** from `value` and `routines.daily_target`:

- `value >= daily_target` (or `daily_target IS NULL` and `value > 0`) → `'done'`
- `value > 0` but below target → `'partial'`
- `value = 0` or negative → row deleted (treated as no log)

This lets `domain/streak`, `Heatmap30`, and other existing readers stay unchanged.

### Migration

One Drizzle migration:
1. Add three columns to `routines` with defaults / nullability above.
2. Add `value` to `routine_logs`.
3. Add the three check constraints listed above.
4. Backfill: existing routines already get `kind='check'` via the column default; no data update needed.

## UI Components

### New: `src/components/routines/BarChart30.tsx`

Pure-CSS, sibling to `Heatmap30`.

```ts
type Props = {
  cells: Array<{ date: string; value: number | null }>;
  target?: number;
  unit: string;
};
```

- 30 vertical bars in a flex row, gap-px, same row width as `Heatmap30`.
- Bar height = `value / max(target ?? 1, observedMax)`, capped at 100%.
- Color tiers:
  - `value >= target` (or any `value > 0` when target is null) → `bg-emerald-500`
  - `value > 0` but below target → `bg-emerald-300`
  - `value === 0 || value === null` → `bg-paper-tint`
- Goal line: when `target` is set, render a 1px `border-t border-emerald-600/40` at target height across the chart.
- `aria-label="30-day {unit} bar chart, oldest on the left"`, per-bar `title="{date} — {value} {unit}"`.

### New: `src/components/routines/QuantityLogInput.tsx`

- Numeric `<input inputmode="numeric">` + `Add` button.
- Submits via server action `incrementRoutineLog`.
- Inline today's total: `Today: {value} {unit}` or `Today: {value} / {target} {unit}` when target set.
- Small `Edit` link opens a popover (Radix) with absolute-value input and `Clear` button — calls `setRoutineLogValue`.
- Validates: positive integer; rejects non-numeric, zero, and negative.

### Modified: `src/components/routines/RoutineRow.tsx`

Branch on `routine.kind`:

- `'check'` (existing): `StatusCycleButton` + `Heatmap30`.
- `'quantity'` (new): `QuantityLogInput` + `BarChart30`.

Title, archive control, and row layout shared between both branches.

### Modified: routine create/edit form

Add a `Kind` toggle (segmented control: Check / Quantity).
- When `Quantity` selected: show `Unit` text input (placeholder `"min"`, required) and optional `Daily target` numeric input.
- When `Check` selected: hide both.
- Form validation enforces the same constraints as the DB.

### `/today` page

No structural change. Same routine list; row internals vary by `kind`.

## Data flow

### Read

`src/services/today.ts` `getTodayRoutines`:
- Extends projection to include `kind`, `unit`, `dailyTarget`, today's `value`, and 30 days of `(date, value)` pairs (for quantity routines only).
- Check-routine query stays untouched. New quantity-routine query left-joins `routine_logs` across the trailing 30-day date range. Run both in parallel via `Promise.all`.

### Write

New service action `src/services/routine_logs.actions.ts` `incrementRoutineLog(routineId, delta)`:

1. Validate `routine.kind === 'quantity'` and `delta > 0`.
2. Compute the post-update value in a single SQL round-trip. Two options, decided at implementation time:
   - **(a)** Read current value → compute new value + status in TS → upsert. Simpler; race window between read and write is acceptable for a single-user app.
   - **(b)** Use `INSERT ... ON CONFLICT DO UPDATE` with a `RETURNING` clause and recompute `status` in a follow-up `UPDATE` based on the returned post-update value. Race-free but two statements.

   Default to (a) unless the integration test surfaces a real race. `status` derivation rules live in a small TS helper `deriveQuantityStatus(value, target)` shared by `incrementRoutineLog` and `setRoutineLogValue`.
3. `revalidatePath('/today')`.

`setRoutineLogValue(routineId, date, value)` — absolute set, used by Edit popover. If `value <= 0`, deletes the row.

Existing `cycleRoutineLogStatus` stays for check routines and rejects quantity routines with a clear error.

### Streak semantics

A day counts toward streak if `status = 'done'` — same predicate as check routines.
- Quantity with target: must hit target.
- Quantity without target: any positive value counts.

`domain/streak` requires no changes.

## Edge cases

- **Lowering target after the fact:** does not retroactively rewrite historical `status`. Acceptable tradeoff vs. recompute-on-read complexity. Documented in code comment near `derived_status`.
- **Setting value to 0 / clearing:** row deleted, day reads as no log.
- **Archived routines:** existing `archivedAt` filter on the routines query already excludes them; no extra work.
- **Direct SQL writes bypassing services:** can violate cross-table invariants (quantity log without value, check log with value). Accepted risk; not exposed via API.

## Testing

Following project TDD pattern; integration tests use real Postgres.

### Unit (Vitest)

- `BarChart30.test.tsx` — renders 30 cells, height scaling, color tiers, goal line presence/absence, accessibility labels.
- `QuantityLogInput.test.tsx` — renders current total, calls action with parsed delta, input validation.
- `domain/streak` — add quantity-routine fixtures: streak counts target-met days; counts any-positive days when target is null.

### Integration (real DB)

- `routine_logs.actions.spec.ts`:
  - `incrementRoutineLog` inserts row with correct value + derived `status`.
  - Same-day second call updates in place (unique index respected).
  - Status flips `partial → done` when cumulative value crosses target.
  - Rejects when routine is `kind='check'`.
  - Rejects zero/negative delta.
- `routines.actions.spec.ts`:
  - Creating a quantity routine without `unit` fails validation.
  - Creating a check routine with `unit` set fails validation.
  - Migration smoke test: existing routines load with `kind='check'`, `unit=null`, `daily_target=null`.

### E2E (Playwright, single happy path)

Create exercise routine (kind=quantity, unit=min, target=30) → log 15 min → log 20 min → today shows `35 / 30 min`, today's bar emerald-500, goal line visible at target height.

## Open questions

None blocking. The cross-table invariant enforcement (service-layer vs. trigger) was decided in favor of simplicity; revisit if direct-SQL drift becomes a real problem.

## File-level change list

**New:**
- `src/db/migrations/NNNN_quantity_routines.sql` (auto-generated by Drizzle)
- `src/components/routines/BarChart30.tsx`
- `src/components/routines/QuantityLogInput.tsx`
- `src/components/routines/__tests__/BarChart30.test.tsx`
- `src/components/routines/__tests__/QuantityLogInput.test.tsx`

**Modified:**
- `src/db/schema/routines.ts` — add `kind`, `unit`, `daily_target` + check constraints
- `src/db/schema/routine_logs.ts` — add `value`
- `src/lib/zod/routines.ts` — extend create/update schemas
- `src/services/routines.ts` / `routines.actions.ts` — accept new fields
- `src/services/routine_logs.ts` / `routine_logs.actions.ts` — add `incrementRoutineLog`, `setRoutineLogValue`; gate existing actions on `kind`
- `src/services/today.ts` — extended projection for quantity routines
- `src/components/routines/RoutineRow.tsx` — branch on `kind`
- Routine create/edit form component — add Kind toggle, Unit, Daily target fields
- `tests/integration/routine_logs.spec.ts` (or equivalent) — new cases
- `tests/integration/routines.spec.ts` — new validation cases
- `tests/e2e/quantity-routine.spec.ts` — new happy-path test
