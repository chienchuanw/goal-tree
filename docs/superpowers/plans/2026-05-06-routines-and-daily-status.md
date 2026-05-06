# Routines & Daily Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/today` (gated): a cadence-aware list of routines with tri-state status cycle button (`unset → done → partial → skipped → unset`), 2-day backfill window, per-routine streak count, and 30-day server-rendered heatmap. Plus routine create + archive. All Auth.js-gated, scoped per user, fully TDD'd.

**Architecture:** Pure-domain cadence + streak math in `src/domain/{cadence,streak}.ts` (no I/O, unit-tested). Repo functions in `src/services/{routines,routine_logs}.ts` accept an injected `DbOrTx` so integration tests run inside `withRollback`. Server actions in `src/services/{routines,routine_logs}.actions.ts` (separate `'use server'` modules) wrap repo calls with `auth()` + `revalidatePath('/today')`. RSC page composes the list; only `<StatusCycleButton>` is a client component (uses `useTransition`).

**Tech Stack:** Next 16 (App Router, RSC + server actions, `revalidatePath`, `proxy.ts` middleware), React 19 (`useActionState`, `useTransition`, `useEffect`-only side effects), Drizzle ORM (postgres-js driver, `Tx`/`DbOrTx` injection), Auth.js v5, Zod 4 (`z.iso.date()`, `z.uuid()`, `z.enum(...)`), Tailwind 4, shadcn/ui (`@base-ui/react` Dialog uses `<DialogTrigger render={<Button />}>`, NOT Radix `asChild`), Vitest 4 (unit project = happy-dom, integration project = node + `fileParallelism: false`), pnpm.

**Reference:**
- openspec proposal: `openspec/changes/routines-and-daily-status/proposal.md`
- openspec design (D1–D10): `openspec/changes/routines-and-daily-status/design.md`
- openspec spec (9 requirements): `openspec/changes/routines-and-daily-status/specs/routines/spec.md`
- openspec tasks (skeleton): `openspec/changes/routines-and-daily-status/tasks.md`
- upstream spec: `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md` §5.2
- precedent (mirror this shape): `docs/superpowers/plans/2026-05-06-goals-and-countdown.md`, `src/services/goals.ts`, `src/services/goals.actions.ts`, `src/components/goals/*`, `src/lib/zod/goals.ts`
- GitHub issue: https://github.com/chienchuanw/goal-tree/issues/2

> ⚠️ **Next 16 caveat:** Before writing the server actions in Task 7 or any RSC, read at minimum:
> - `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — `'use server'` placement
> - `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` — when/how to call `revalidatePath`
> - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
> - `node_modules/next/dist/docs/01-app/02-guides/forms.md` — `useActionState` + form patterns
>
> Do NOT trust prior-version Next memory. Per repo `AGENTS.md`: "this is NOT the Next.js you know."

> ⚠️ **shadcn Dialog caveat:** This repo's Dialog comes from `@base-ui/react`, not Radix. `<DialogTrigger>` does NOT support Radix's `asChild` prop — use `<DialogTrigger render={<Button />}>`. See `src/components/goals/CreateGoalDialog.tsx` for the precedent.

> ⚠️ **React 19 caveat:** Side effects (closing dialogs, calling success callbacks) MUST live in `useEffect`, never in render body — Strict Mode replays renders. Non-serializable client-component prop functions for `'use client'` boundaries MUST end in `Action` (e.g., `onSuccessAction`). See `src/components/goals/CreateGoalForm.tsx`.

---

## File Structure (created or modified by this plan)

```
src/
  domain/
    cadence.ts                                       ← NEW: appliesOn (pure)
    streak.ts                                        ← NEW: streakLength + build30DayHeatmap (pure)
  lib/
    zod/
      routines.ts                                    ← NEW: CreateRoutineSchema + SetRoutineStatusSchema
  services/
    routines.ts                                      ← NEW: createRoutine, listActiveRoutines, archiveRoutine
    routines.actions.ts                              ← NEW: 'use server' wrappers (create + archive)
    routine_logs.ts                                  ← NEW: setRoutineStatus, listLogsForLast30Days
    routine_logs.actions.ts                          ← NEW: setRoutineStatusAction
    today.ts                                         ← NEW: listTodayRoutines aggregator
  components/
    routines/
      StatusCycleButton.tsx                          ← NEW: 'use client', useTransition + optimistic state
      Heatmap30.tsx                                  ← NEW: RSC, 30 colored cells
      RoutineRow.tsx                                 ← NEW: RSC, title + cycle button + streak + heatmap
      RoutinesGroupedByGoal.tsx                      ← NEW: RSC, groups by goal title
      CreateRoutineForm.tsx                          ← NEW: 'use client', useActionState + conditional weekday checkboxes
      CreateRoutineDialog.tsx                        ← NEW: 'use client', mirrors CreateGoalDialog
      ArchiveRoutineButton.tsx                       ← NEW: server-action form

app/
  (app)/
    today/
      page.tsx                                       ← REPLACE placeholder with real RSC
    page.tsx                                         ← NEW (or modified) root: redirect authenticated → /today

tests/
  unit/
    domain/
      cadence.test.ts                                ← NEW
      streak.test.ts                                 ← NEW
    lib/
      zod/
        routines.test.ts                             ← NEW
    components/
      routines/
        StatusCycleButton.test.tsx                   ← NEW (RTL)
  integration/
    services/
      routines.test.ts                               ← NEW (withRollback + seedUser)
      routine_logs.test.ts                           ← NEW
      today.test.ts                                  ← NEW
```

**Naming consistency contract** (verified against later tasks before any are written):

- Domain: `appliesOn(routine, date)` in `cadence.ts`; `streakLength(logs, today, applies)` and `build30DayHeatmap(logs, today, applies)` in `streak.ts`.
- Repo functions in `src/services/routines.ts`: `createRoutine(input, userId, db?)`, `listActiveRoutines(userId, db?)`, `getRoutine(id, userId, db?)`, `archiveRoutine(id, userId, db?)`.
- Repo functions in `src/services/routine_logs.ts`: `setRoutineStatus(routineId, userId, date, status, db?)`, `listLogsForLast30Days(routineId, userId, today, db?)`. **All scoped via JOIN through `routines.userId = userId`** (see D7).
- Aggregator in `src/services/today.ts`: `listTodayRoutines(userId, today, db?)` returning `Array<{ routine, goalTitle, todayLog, last30Logs, streak, heatmap }>`.
- Server actions: `createRoutineAction(prev, formData)`, `archiveRoutineAction(id)` in `routines.actions.ts`; `setRoutineStatusAction(routineId, date, status | null)` in `routine_logs.actions.ts`.
- Zod schemas: `CreateRoutineSchema`, `SetRoutineStatusSchema` (and inferred types `CreateRoutineInput`, `SetRoutineStatusInput`).
- Components: `<StatusCycleButton>`, `<Heatmap30>`, `<RoutineRow>`, `<RoutinesGroupedByGoal>`, `<CreateRoutineForm>`, `<CreateRoutineDialog>`, `<ArchiveRoutineButton>`.
- Cell-status union (used by Heatmap30 + build30DayHeatmap): `'done' | 'partial' | 'skipped' | 'none' | 'na'`. Exported as `HeatmapCellStatus` from `src/domain/streak.ts`.

---

## Task 1: Domain — `appliesOn` (pure, TDD)

Implements design D1 + D2; covers spec scenarios "Daily routine appears every day", "Weekday routine appears only on listed weekdays", "Weekday routine hidden on non-listed weekdays".

**Files:**
- Create: `tests/unit/domain/cadence.test.ts`
- Create: `src/domain/cadence.ts`

- [ ] **Step 1.1: Write the failing unit tests**

Create `tests/unit/domain/cadence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appliesOn } from '@/domain/cadence';

describe('appliesOn', () => {
  describe('Given a daily routine', () => {
    describe('When called with any date', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'daily', weekdays: null }, '2026-05-06')).toBe(true);
        expect(appliesOn({ cadenceType: 'daily', weekdays: null }, '2026-05-10')).toBe(true);
      });
    });
  });

  describe('Given a weekdays routine matching {1,3,5} (Mon/Wed/Fri)', () => {
    describe('When called with a Wednesday Taipei date', () => {
      // 2026-05-06 = Wed
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-06')).toBe(true);
      });
    });

    describe('When called with a Sunday Taipei date', () => {
      // 2026-05-10 = Sun
      it('Then returns false', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-10')).toBe(false);
      });
    });

    describe('When called with a Monday Taipei date', () => {
      // 2026-05-04 = Mon
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-04')).toBe(true);
      });
    });
  });

  describe('Given a weekdays routine with a null weekdays array', () => {
    describe('When called', () => {
      it('Then returns false (defensive: schema CHECK should prevent this)', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: null }, '2026-05-06')).toBe(false);
      });
    });
  });

  describe('Given each weekday', () => {
    describe('When weekdays=[0] (Sun) and date is Sun 2026-05-10', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [0] }, '2026-05-10')).toBe(true);
      });
    });

    describe('When weekdays=[6] (Sat) and date is Sat 2026-05-09', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [6] }, '2026-05-09')).toBe(true);
      });
    });
  });
});
```

- [ ] **Step 1.2: Run the tests — confirm RED**

Run: `pnpm test:unit -- cadence`
Expected: FAIL — `Cannot find module '@/domain/cadence'`.

- [ ] **Step 1.3: Commit the failing tests**

```bash
git add tests/unit/domain/cadence.test.ts
git commit -m "test(domain): add failing cadence.appliesOn tests"
```

- [ ] **Step 1.4: Implement `src/domain/cadence.ts`**

```ts
/**
 * Cadence model — see openspec D1.
 *
 * `weekdays` uses JS Date#getDay() semantics (0=Sun .. 6=Sat) — same as
 * `weekdayInTaipei()` from `./taipei`. UI labels say "Mon Tue ..." but the
 * stored numbers are always the JS convention.
 */

export type RoutineCadence = {
  cadenceType: 'daily' | 'weekdays';
  weekdays: number[] | null;
};

/**
 * True if a routine's cadence applies on the given Taipei calendar date.
 * `date` MUST be a YYYY-MM-DD string (the format `todayInTaipei` returns).
 */
export function appliesOn(routine: RoutineCadence, date: string): boolean {
  if (routine.cadenceType === 'daily') return true;
  if (!routine.weekdays?.length) return false;
  // Treat the YYYY-MM-DD string as a UTC midnight timestamp; getUTCDay
  // gives the same weekday number as if the date were a Taipei calendar day.
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
  return routine.weekdays.includes(weekday);
}
```

- [ ] **Step 1.5: Run the tests — confirm GREEN**

Run: `pnpm test:unit -- cadence`
Expected: PASS — 7/7.

- [ ] **Step 1.6: Commit the implementation**

```bash
git add src/domain/cadence.ts
git commit -m "feat(domain): add appliesOn for daily/weekdays cadence"
```

---

## Task 2: Domain — `streakLength` + `build30DayHeatmap` (pure, TDD)

Implements design D4 + D5; covers spec requirements "Streak count shown per routine" and "30-day heatmap rendered server-side".

**Files:**
- Create: `tests/unit/domain/streak.test.ts`
- Create: `src/domain/streak.ts`

- [ ] **Step 2.1: Write the failing unit tests**

Create `tests/unit/domain/streak.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { streakLength, build30DayHeatmap, type LogStatus } from '@/domain/streak';

const log = (date: string, status: LogStatus) => ({ logDate: date, status });

// Helper: always-true predicate (daily routine).
const allDays = (_d: string) => true;

// Helper: only weekdays {1,3,5} (Mon/Wed/Fri) apply.
const mwf = (d: string) => [1, 3, 5].includes(new Date(d + 'T00:00:00Z').getUTCDay());

describe('streakLength', () => {
  describe('Given no logs', () => {
    describe('When called', () => {
      it('Then returns 0', () => {
        expect(streakLength([], '2026-05-06', allDays)).toBe(0);
      });
    });
  });

  describe('Given today done with two prior consecutive done days', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 3', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'done'),
          log('2026-05-04', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(3);
      });
    });
  });

  describe('Given today is unmarked (no log) and yesterday was done', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 0 — today must be marked to count', () => {
        const logs = [log('2026-05-05', 'done'), log('2026-05-04', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(0);
      });
    });
  });

  describe('Given today=done, yesterday=skipped, two-days-ago=done', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 1 — skipped breaks the streak', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'skipped'),
          log('2026-05-04', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(1);
      });
    });
  });

  describe('Given partial counts as kept', () => {
    describe('When today=partial and yesterday=done', () => {
      it('Then returns 2', () => {
        const logs = [log('2026-05-06', 'partial'), log('2026-05-05', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(2);
      });
    });
  });

  describe('Given a missing day in between', () => {
    describe('When today=done, yesterday=missing, two-days-ago=done', () => {
      it('Then returns 1 — gap breaks the streak', () => {
        const logs = [log('2026-05-06', 'done'), log('2026-05-04', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(1);
      });
    });
  });

  describe('Given a weekday {1,3,5} (Mon/Wed/Fri) routine', () => {
    // 2026-05-06 = Wed, 05-05 = Tue (na), 05-04 = Mon, 05-03 = Sun (na), 05-02 = Sat (na), 05-01 = Fri
    describe('When today=Wed=done, last Mon=done, last Fri=done', () => {
      it('Then returns 3 — non-applicable days are transparent', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-04', 'done'),
          log('2026-05-01', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', mwf)).toBe(3);
      });
    });

    describe('When today (Wed) is unmarked', () => {
      it('Then returns 0', () => {
        const logs = [log('2026-05-04', 'done'), log('2026-05-01', 'done')];
        expect(streakLength(logs, '2026-05-06', mwf)).toBe(0);
      });
    });
  });
});

describe('build30DayHeatmap', () => {
  describe('Given an empty log set', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 30 cells of status "none", oldest first', () => {
        const cells = build30DayHeatmap([], '2026-05-06', allDays);
        expect(cells).toHaveLength(30);
        expect(cells.every((c) => c.status === 'none')).toBe(true);
        expect(cells[0]!.date).toBe('2026-04-07'); // today - 29
        expect(cells[29]!.date).toBe('2026-05-06');
      });
    });
  });

  describe('Given mixed logs over the last 30 days', () => {
    describe('When called for a daily routine', () => {
      it('Then each cell reflects its log status, others "none"', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'partial'),
          log('2026-05-04', 'skipped'),
        ];
        const cells = build30DayHeatmap(logs, '2026-05-06', allDays);
        expect(cells[29]!.status).toBe('done');
        expect(cells[28]!.status).toBe('partial');
        expect(cells[27]!.status).toBe('skipped');
        expect(cells[26]!.status).toBe('none');
      });
    });
  });

  describe('Given a weekday {1,3,5} routine', () => {
    describe('When called', () => {
      it('Then non-Mon/Wed/Fri cells are classified "na"', () => {
        const cells = build30DayHeatmap([], '2026-05-06', mwf);
        // 2026-05-06 = Wed → applicable → "none" (no log)
        expect(cells[29]!.status).toBe('none');
        // 2026-05-05 = Tue → not applicable → "na"
        expect(cells[28]!.status).toBe('na');
        // 2026-05-04 = Mon → applicable → "none"
        expect(cells[27]!.status).toBe('none');
      });
    });
  });
});
```

- [ ] **Step 2.2: Run — confirm RED**

Run: `pnpm test:unit -- streak`
Expected: FAIL — `Cannot find module '@/domain/streak'`.

- [ ] **Step 2.3: Commit failing tests**

```bash
git add tests/unit/domain/streak.test.ts
git commit -m "test(domain): add failing streak + heatmap tests"
```

- [ ] **Step 2.4: Implement `src/domain/streak.ts`**

```ts
export type LogStatus = 'done' | 'partial' | 'skipped';
export type HeatmapCellStatus = LogStatus | 'none' | 'na';

export type StreakLog = { logDate: string; status: LogStatus };
export type AppliesPredicate = (date: string) => boolean;

const DAY_MS = 86_400_000;

function shiftDate(date: string, deltaDays: number): string {
  const t = Date.parse(date + 'T00:00:00Z') + deltaDays * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Streak length walked back from `today` until an applicable day is missing
 * or marked `skipped`. `done` and `partial` keep the streak alive.
 * Non-applicable days (where `applies(date)` is false) are skipped over.
 *
 * If today itself is non-applicable, the walk starts at today anyway and the
 * first applicable day backwards becomes the streak head.
 */
export function streakLength(
  logs: ReadonlyArray<StreakLog>,
  today: string,
  applies: AppliesPredicate,
): number {
  const byDate = new Map(logs.map((l) => [l.logDate, l.status]));
  let streak = 0;
  let cursor = today;
  // Bound the walk to avoid pathological loops on malformed inputs.
  for (let i = 0; i < 366; i++) {
    if (applies(cursor)) {
      const status = byDate.get(cursor);
      if (status === 'done' || status === 'partial') {
        streak += 1;
      } else {
        // skipped, missing, or unknown → stop
        return streak;
      }
    }
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/**
 * 30 cells, oldest on the left (index 0) and `today` on the right (index 29).
 * Each cell is one of: the actual log status, 'none' (applicable but unmarked),
 * or 'na' (cadence didn't apply that day).
 */
export function build30DayHeatmap(
  logs: ReadonlyArray<StreakLog>,
  today: string,
  applies: AppliesPredicate,
): Array<{ date: string; status: HeatmapCellStatus }> {
  const byDate = new Map(logs.map((l) => [l.logDate, l.status]));
  const cells: Array<{ date: string; status: HeatmapCellStatus }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = shiftDate(today, -i);
    if (!applies(date)) {
      cells.push({ date, status: 'na' });
      continue;
    }
    const status = byDate.get(date);
    cells.push({ date, status: status ?? 'none' });
  }
  return cells;
}
```

- [ ] **Step 2.5: Run — confirm GREEN**

Run: `pnpm test:unit -- streak`
Expected: PASS — 11/11.

- [ ] **Step 2.6: Commit implementation**

```bash
git add src/domain/streak.ts
git commit -m "feat(domain): add streakLength + build30DayHeatmap"
```

---

## Task 3: Zod schemas — `CreateRoutineSchema` + `SetRoutineStatusSchema` (TDD)

Implements design D9; covers spec requirements "Routine creation form" (validation parts) and "Backfill window enforced server-side" (input shape parts).

**Files:**
- Create: `tests/unit/lib/zod/routines.test.ts`
- Create: `src/lib/zod/routines.ts`

- [ ] **Step 3.1: Write the failing unit tests**

Create `tests/unit/lib/zod/routines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreateRoutineSchema, SetRoutineStatusSchema } from '@/lib/zod/routines';

describe('CreateRoutineSchema', () => {
  describe('Given a valid daily routine', () => {
    describe('When parsed', () => {
      it('Then returns the typed object', () => {
        const result = CreateRoutineSchema.parse({
          title: 'Read 30 min',
          cadenceType: 'daily',
        });
        expect(result.title).toBe('Read 30 min');
        expect(result.cadenceType).toBe('daily');
      });
    });
  });

  describe('Given a valid weekdays routine', () => {
    describe('When parsed', () => {
      it('Then returns the typed object', () => {
        const result = CreateRoutineSchema.parse({
          title: 'Run',
          cadenceType: 'weekdays',
          weekdays: [1, 3, 5],
        });
        expect(result.weekdays).toEqual([1, 3, 5]);
      });
    });
  });

  describe('Given a weekdays routine with no weekdays array', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({ title: 'Run', cadenceType: 'weekdays' }),
        ).toThrow();
      });
    });
  });

  describe('Given a daily routine with weekdays array', () => {
    describe('When parsed', () => {
      it('Then throws (weekdays must be absent for daily)', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'Run',
            cadenceType: 'daily',
            weekdays: [1, 3],
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({ title: '', cadenceType: 'daily' }),
        ).toThrow();
      });
    });
  });

  describe('Given a weekday number out of range', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'Run',
            cadenceType: 'weekdays',
            weekdays: [7],
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a goalId that is a valid uuid', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const goalId = '550e8400-e29b-41d4-a716-446655440000';
        const result = CreateRoutineSchema.parse({
          title: 'X',
          cadenceType: 'daily',
          goalId,
        });
        expect(result.goalId).toBe(goalId);
      });
    });
  });

  describe('Given a goalId that is not a uuid', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'X',
            cadenceType: 'daily',
            goalId: 'not-a-uuid',
          }),
        ).toThrow();
      });
    });
  });
});

describe('SetRoutineStatusSchema', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('Given each valid status', () => {
    describe('When parsed', () => {
      it('Then accepts done, partial, skipped, and null', () => {
        for (const status of ['done', 'partial', 'skipped', null] as const) {
          const result = SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026-05-06',
            status,
          });
          expect(result.status).toBe(status);
        }
      });
    });
  });

  describe('Given a malformed date', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026/05/06',
            status: 'done',
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a non-uuid routineId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: 'not-a-uuid',
            date: '2026-05-06',
            status: 'done',
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an unknown status string', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026-05-06',
            status: 'maybe',
          }),
        ).toThrow();
      });
    });
  });
});
```

- [ ] **Step 3.2: Run — confirm RED**

Run: `pnpm test:unit -- routines`
Expected: FAIL — `Cannot find module '@/lib/zod/routines'`.

- [ ] **Step 3.3: Implement `src/lib/zod/routines.ts`**

```ts
import { z } from 'zod';

export const CreateRoutineSchema = z
  .object({
    title: z.string().min(1).max(200),
    goalId: z.uuid().optional().nullable(),
    cadenceType: z.enum(['daily', 'weekdays']),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  })
  .refine(
    (v) =>
      v.cadenceType === 'daily'
        ? !v.weekdays?.length
        : !!v.weekdays?.length,
    {
      message: 'weekdays required when cadenceType=weekdays (and absent for daily)',
      path: ['weekdays'],
    },
  );

export const SetRoutineStatusSchema = z.object({
  routineId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(['done', 'partial', 'skipped']).nullable(),
});

export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>;
export type SetRoutineStatusInput = z.infer<typeof SetRoutineStatusSchema>;
```

- [ ] **Step 3.4: Run — confirm GREEN**

Run: `pnpm test:unit -- routines`
Expected: PASS — 12/12.

- [ ] **Step 3.5: Commit (single commit; tight RED→GREEN loop)**

```bash
git add tests/unit/lib/zod/routines.test.ts src/lib/zod/routines.ts
git commit -m "feat(lib/zod): add CreateRoutineSchema + SetRoutineStatusSchema"
```

---

## Task 4: Service repo — `routines` (TDD against real Postgres)

Implements spec requirements "Routine creation form" (DB write), "Today page lists applicable routines" (`listActiveRoutines` foundation), "Routine archival is idempotent and user-scoped". Implements design D7.

**Files:**
- Create: `tests/integration/services/routines.test.ts`
- Create: `src/services/routines.ts`

- [ ] **Step 4.1: Write the failing integration tests**

Create `tests/integration/services/routines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { routines } from '@/db/schema';
import {
  createRoutine,
  listActiveRoutines,
  getRoutine,
  archiveRoutine,
} from '@/services/routines';

describe('createRoutine', () => {
  describe('Given a valid daily routine input', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts a row scoped to the userId with weekdays=null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Read 30 min', cadenceType: 'daily' },
            u.id,
            tx,
          );
          expect(created.userId).toBe(u.id);
          expect(created.cadenceType).toBe('daily');
          expect(created.weekdays).toBeNull();
          expect(created.archivedAt).toBeNull();
        });
      });
    });
  });

  describe('Given a valid weekdays routine input', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts a row with the weekdays array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Run', cadenceType: 'weekdays', weekdays: [1, 3, 5] },
            u.id,
            tx,
          );
          expect(created.weekdays).toEqual([1, 3, 5]);
        });
      });
    });
  });

  describe('Given a null goalId', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts with goalId=null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Standalone', cadenceType: 'daily', goalId: null },
            u.id,
            tx,
          );
          expect(created.goalId).toBeNull();
        });
      });
    });
  });

  describe('Given a weekdays routine without a weekdays array', () => {
    describe('When createRoutine is called', () => {
      it('Then throws (Zod refinement) and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createRoutine({ title: 'X', cadenceType: 'weekdays' }, u.id, tx),
          ).rejects.toThrow();
          const rows = await tx.select().from(routines).where(eq(routines.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });
});

describe('listActiveRoutines', () => {
  describe('Given a user with no routines', () => {
    describe('When listActiveRoutines is called', () => {
      it('Then returns an empty array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const rows = await listActiveRoutines(u.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user A has two active routines, one archived, and user B has one', () => {
    describe('When listActiveRoutines is called for user A', () => {
      it('Then returns only user A non-archived rows', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(routines).values([
            { userId: a.id, title: 'A1', cadenceType: 'daily' },
            { userId: a.id, title: 'A2', cadenceType: 'daily' },
            { userId: a.id, title: 'A-archived', cadenceType: 'daily', archivedAt: new Date() },
            { userId: b.id, title: 'B1', cadenceType: 'daily' },
          ]);
          const rows = await listActiveRoutines(a.id, tx);
          expect(rows.map((r) => r.title).sort()).toEqual(['A1', 'A2']);
        });
      });
    });
  });
});

describe('getRoutine', () => {
  describe('Given a routine owned by user A', () => {
    describe('When getRoutine is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'mine', cadenceType: 'daily' })
            .returning();
          const fetched = await getRoutine(r.id, b.id, tx);
          expect(fetched).toBeNull();
        });
      });
    });
  });
});

describe('archiveRoutine', () => {
  describe('Given an active routine owned by user A', () => {
    describe('When archiveRoutine is called by user A', () => {
      it('Then archivedAt is set and the row no longer appears in listActiveRoutines', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'x', cadenceType: 'daily' })
            .returning();
          await archiveRoutine(r.id, a.id, tx);
          const [after] = await tx.select().from(routines).where(eq(routines.id, r.id));
          expect(after.archivedAt).not.toBeNull();
          const active = await listActiveRoutines(a.id, tx);
          expect(active).toEqual([]);
        });
      });
    });
  });

  describe('Given an already-archived routine', () => {
    describe('When archiveRoutine is called again by the owner', () => {
      it('Then it is a no-op (archivedAt unchanged) and does not error', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const stamp = new Date('2026-04-01T00:00:00Z');
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'x', cadenceType: 'daily', archivedAt: stamp })
            .returning();
          await expect(archiveRoutine(r.id, a.id, tx)).resolves.toBeUndefined();
          const [after] = await tx.select().from(routines).where(eq(routines.id, r.id));
          expect(after.archivedAt?.getTime()).toBe(stamp.getTime());
        });
      });
    });
  });

  describe('Given a routine owned by user A', () => {
    describe('When archiveRoutine is called by user B', () => {
      it('Then user A routine is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'mine', cadenceType: 'daily' })
            .returning();
          await archiveRoutine(r.id, b.id, tx);
          const [after] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, r.id), eq(routines.userId, a.id)));
          expect(after.archivedAt).toBeNull();
        });
      });
    });
  });
});
```

- [ ] **Step 4.2: Run — confirm RED**

Make sure Postgres is up: `docker compose ps` (start with `docker compose up -d db` if not).
Run: `pnpm test:integration -- routines`
Expected: FAIL — `Cannot find module '@/services/routines'`.

- [ ] **Step 4.3: Commit failing tests**

```bash
git add tests/integration/services/routines.test.ts
git commit -m "test(services): add failing routines service tests"
```

- [ ] **Step 4.4: Implement `src/services/routines.ts`**

```ts
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { routines, type Routine } from '@/db/schema';
import { CreateRoutineSchema } from '@/lib/zod/routines';

export async function listActiveRoutines(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine[]> {
  return db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, userId), isNull(routines.archivedAt)))
    .orderBy(asc(routines.createdAt));
}

export async function getRoutine(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine | null> {
  const rows = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), eq(routines.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRoutine(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine> {
  const parsed = CreateRoutineSchema.parse(input);
  const [row] = await db
    .insert(routines)
    .values({
      userId,
      goalId: parsed.goalId ?? null,
      title: parsed.title,
      cadenceType: parsed.cadenceType,
      weekdays: parsed.cadenceType === 'weekdays' ? parsed.weekdays! : null,
    })
    .returning();
  return row;
}

export async function archiveRoutine(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // Scope by id AND userId AND archivedAt IS NULL so:
  //  - cross-user calls match zero rows (silent no-op)
  //  - already-archived rows match zero rows (idempotent)
  await db
    .update(routines)
    .set({ archivedAt: sql`now()` })
    .where(
      and(
        eq(routines.id, id),
        eq(routines.userId, userId),
        isNull(routines.archivedAt),
      ),
    );
}
```

- [ ] **Step 4.5: Run — confirm GREEN**

Run: `pnpm test:integration -- routines`
Expected: PASS — 9/9.

- [ ] **Step 4.6: Commit implementation**

```bash
git add src/services/routines.ts
git commit -m "feat(services): add routines repo (create/list/get/archive, user-scoped)"
```

---

## Task 5: Service repo — `routine_logs` (TDD against real Postgres)

Implements spec requirements "Status cycle button persists state" (DB), "Backfill window enforced server-side". Implements design D6 + D7 (defense-in-depth via JOIN through `routines.userId`).

**Files:**
- Create: `tests/integration/services/routine_logs.test.ts`
- Create: `src/services/routine_logs.ts`

- [ ] **Step 5.1: Write the failing integration tests**

Create `tests/integration/services/routine_logs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { routines, routineLogs } from '@/db/schema';
import {
  setRoutineStatus,
  listLogsForLast30Days,
} from '@/services/routine_logs';
import { todayInTaipei } from '@/domain/taipei';

async function seedRoutine(tx: any, userId: string) {
  const [r] = await tx
    .insert(routines)
    .values({ userId, title: 'r', cadenceType: 'daily' })
    .returning();
  return r;
}

const shift = (date: string, days: number) =>
  new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe('setRoutineStatus', () => {
  describe('Given no existing log for today', () => {
    describe('When setRoutineStatus is called with status=done', () => {
      it('Then a row is inserted', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const today = todayInTaipei();
          await setRoutineStatus(r.id, u.id, today, 'done', tx);
          const [row] = await tx
            .select()
            .from(routineLogs)
            .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, today)));
          expect(row.status).toBe('done');
        });
      });
    });
  });

  describe('Given an existing log for today with status=done', () => {
    describe('When setRoutineStatus is called with status=partial', () => {
      it('Then the row is updated, not duplicated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const today = todayInTaipei();
          await tx
            .insert(routineLogs)
            .values({ routineId: r.id, logDate: today, status: 'done' });
          await setRoutineStatus(r.id, u.id, today, 'partial', tx);
          const rows = await tx
            .select()
            .from(routineLogs)
            .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, today)));
          expect(rows).toHaveLength(1);
          expect(rows[0]!.status).toBe('partial');
        });
      });
    });
  });

  describe('Given an existing log for today', () => {
    describe('When setRoutineStatus is called with status=null', () => {
      it('Then the row is deleted', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const today = todayInTaipei();
          await tx
            .insert(routineLogs)
            .values({ routineId: r.id, logDate: today, status: 'skipped' });
          await setRoutineStatus(r.id, u.id, today, null, tx);
          const rows = await tx
            .select()
            .from(routineLogs)
            .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, today)));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given a date 2 days before today in Taipei', () => {
    describe('When setRoutineStatus is called', () => {
      it('Then it succeeds (within backfill window)', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const date = shift(todayInTaipei(), -2);
          await setRoutineStatus(r.id, u.id, date, 'done', tx);
          const [row] = await tx
            .select()
            .from(routineLogs)
            .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, date)));
          expect(row.status).toBe('done');
        });
      });
    });
  });

  describe('Given a date 3 days before today in Taipei', () => {
    describe('When setRoutineStatus is called', () => {
      it('Then it throws and writes nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const date = shift(todayInTaipei(), -3);
          await expect(setRoutineStatus(r.id, u.id, date, 'done', tx)).rejects.toThrow();
          const rows = await tx.select().from(routineLogs).where(eq(routineLogs.routineId, r.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given a future date', () => {
    describe('When setRoutineStatus is called', () => {
      it('Then it throws', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const date = shift(todayInTaipei(), 1);
          await expect(setRoutineStatus(r.id, u.id, date, 'done', tx)).rejects.toThrow();
        });
      });
    });
  });

  describe('Given a routine owned by user A', () => {
    describe('When setRoutineStatus is called by user B', () => {
      it('Then the routine is unchanged (silent no-op)', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const r = await seedRoutine(tx, a.id);
          const today = todayInTaipei();
          await setRoutineStatus(r.id, b.id, today, 'done', tx);
          const rows = await tx
            .select()
            .from(routineLogs)
            .where(eq(routineLogs.routineId, r.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });
});

describe('listLogsForLast30Days', () => {
  describe('Given a routine with 5 logs over the last 10 days', () => {
    describe('When listLogsForLast30Days is called', () => {
      it('Then returns all 5 ordered by logDate ascending', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await seedRoutine(tx, u.id);
          const today = todayInTaipei();
          const dates = [
            shift(today, -1),
            shift(today, -3),
            shift(today, -5),
            shift(today, -7),
            shift(today, -9),
          ];
          await tx.insert(routineLogs).values(
            dates.map((d) => ({ routineId: r.id, logDate: d, status: 'done' as const })),
          );
          const rows = await listLogsForLast30Days(r.id, u.id, today, tx);
          expect(rows.map((row) => row.logDate)).toEqual([...dates].sort());
        });
      });
    });
  });

  describe('Given a routine owned by user A', () => {
    describe('When listLogsForLast30Days is called by user B', () => {
      it('Then returns []', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const r = await seedRoutine(tx, a.id);
          await tx.insert(routineLogs).values({
            routineId: r.id,
            logDate: todayInTaipei(),
            status: 'done',
          });
          const rows = await listLogsForLast30Days(r.id, b.id, todayInTaipei(), tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });
});
```

- [ ] **Step 5.2: Run — confirm RED**

Run: `pnpm test:integration -- routine_logs`
Expected: FAIL — `Cannot find module '@/services/routine_logs'`.

- [ ] **Step 5.3: Commit failing tests**

```bash
git add tests/integration/services/routine_logs.test.ts
git commit -m "test(services): add failing routine_logs service tests"
```

- [ ] **Step 5.4: Implement `src/services/routine_logs.ts`**

```ts
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { routines, routineLogs, type RoutineLog } from '@/db/schema';
import { isWithinBackfillWindow } from '@/domain/taipei';

type LogStatus = 'done' | 'partial' | 'skipped';

/**
 * Insert / update / delete the log row for `(routineId, date)`.
 * `status === null` means delete.
 *
 * Defense-in-depth: only mutates if the routine actually belongs to `userId`
 * (see openspec D7). Cross-user calls match zero rows and silently no-op.
 *
 * Throws if `date` is outside the 2-day backfill window.
 */
export async function setRoutineStatus(
  routineId: string,
  userId: string,
  date: string,
  status: LogStatus | null,
  db: DbOrTx = defaultDb,
): Promise<void> {
  if (!isWithinBackfillWindow(date)) {
    throw new Error('date is outside the 2-day backfill window');
  }

  await db.transaction(async (tx) => {
    // Verify ownership inside the same tx — guarantees no read-then-write race.
    const [owner] = await tx
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!owner) return;

    if (status === null) {
      await tx
        .delete(routineLogs)
        .where(
          and(eq(routineLogs.routineId, routineId), eq(routineLogs.logDate, date)),
        );
      return;
    }

    // Upsert via the unique index on (routine_id, log_date).
    await tx
      .insert(routineLogs)
      .values({ routineId, logDate: date, status })
      .onConflictDoUpdate({
        target: [routineLogs.routineId, routineLogs.logDate],
        set: { status },
      });
  });
}

/**
 * Last-30-days log rows for a routine the caller owns.
 * Returns empty when the routine belongs to a different user.
 */
export async function listLogsForLast30Days(
  routineId: string,
  userId: string,
  today: string,
  db: DbOrTx = defaultDb,
): Promise<RoutineLog[]> {
  const since = new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return db
    .select({
      id: routineLogs.id,
      routineId: routineLogs.routineId,
      logDate: routineLogs.logDate,
      status: routineLogs.status,
      note: routineLogs.note,
      createdAt: routineLogs.createdAt,
    })
    .from(routineLogs)
    .innerJoin(
      routines,
      and(eq(routines.id, routineLogs.routineId), eq(routines.userId, userId)),
    )
    .where(
      and(
        eq(routineLogs.routineId, routineId),
        gte(routineLogs.logDate, since),
      ),
    )
    .orderBy(asc(routineLogs.logDate));
}
```

- [ ] **Step 5.5: Run — confirm GREEN**

Run: `pnpm test:integration -- routine_logs`
Expected: PASS — 9/9.

If a test fails because the Drizzle type inference complains about the LogStatus literal, double-check the `status: LogStatus` type matches the schema column (`text`). Cast at the insert site if needed: `.values({ ..., status: status as LogStatus })`.

- [ ] **Step 5.6: Commit implementation**

```bash
git add src/services/routine_logs.ts
git commit -m "feat(services): add routine_logs upsert/delete + last-30 query"
```

---

## Task 6: Service aggregator — `listTodayRoutines` (TDD)

Implements spec requirements "Today page lists applicable routines", "Routines group by goal", "Streak count shown per routine", "30-day heatmap rendered server-side". Returns the exact shape the page consumes — page logic stays trivial.

**Files:**
- Create: `tests/integration/services/today.test.ts`
- Create: `src/services/today.ts`

- [ ] **Step 6.1: Write the failing integration test**

Create `tests/integration/services/today.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals, routines, routineLogs } from '@/db/schema';
import { listTodayRoutines } from '@/services/today';
import { todayInTaipei, weekdayInTaipei } from '@/domain/taipei';

describe('listTodayRoutines', () => {
  describe("Given a user with one daily routine, one weekday routine that doesn't apply today, and one archived routine", () => {
    describe('When listTodayRoutines is called', () => {
      it('Then returns only the daily routine with its 30-day heatmap and streak', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const weekdayToday = weekdayInTaipei();
          // a weekday set that excludes today
          const otherWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== weekdayToday).slice(0, 2);

          await tx.insert(routines).values([
            { userId: u.id, title: 'Daily', cadenceType: 'daily' },
            { userId: u.id, title: 'OtherWeekdays', cadenceType: 'weekdays', weekdays: otherWeekdays },
            { userId: u.id, title: 'Archived', cadenceType: 'daily', archivedAt: new Date() },
          ]);

          const rows = await listTodayRoutines(u.id, today, tx);
          expect(rows.map((r) => r.routine.title)).toEqual(['Daily']);
          expect(rows[0]!.heatmap).toHaveLength(30);
          expect(rows[0]!.streak).toBe(0);
        });
      });
    });
  });

  describe('Given a daily routine with done logs for today, yesterday, and two days ago', () => {
    describe('When listTodayRoutines is called', () => {
      it('Then streak is 3 and todayLog reflects done', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const day = (delta: number) =>
            new Date(Date.parse(today + 'T00:00:00Z') + delta * 86_400_000)
              .toISOString()
              .slice(0, 10);

          const [r] = await tx
            .insert(routines)
            .values({ userId: u.id, title: 'Daily', cadenceType: 'daily' })
            .returning();
          await tx.insert(routineLogs).values([
            { routineId: r.id, logDate: day(0), status: 'done' },
            { routineId: r.id, logDate: day(-1), status: 'done' },
            { routineId: r.id, logDate: day(-2), status: 'done' },
          ]);

          const rows = await listTodayRoutines(u.id, today, tx);
          expect(rows[0]!.streak).toBe(3);
          expect(rows[0]!.todayLog?.status).toBe('done');
        });
      });
    });
  });

  describe('Given two routines under one goal and one without a goal', () => {
    describe('When listTodayRoutines is called', () => {
      it('Then each row carries goalTitle (or null) so the page can group', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'Ship MVP', deadlineAt: new Date(Date.now() + 30 * 86_400_000) })
            .returning();
          await tx.insert(routines).values([
            { userId: u.id, goalId: g.id, title: 'A', cadenceType: 'daily' },
            { userId: u.id, goalId: g.id, title: 'B', cadenceType: 'daily' },
            { userId: u.id, title: 'C', cadenceType: 'daily' },
          ]);
          const rows = await listTodayRoutines(u.id, today, tx);
          const titles = rows.map((r) => [r.routine.title, r.goalTitle]);
          expect(titles).toEqual(
            expect.arrayContaining([
              ['A', 'Ship MVP'],
              ['B', 'Ship MVP'],
              ['C', null],
            ]),
          );
        });
      });
    });
  });

  describe('Given user A and user B each with one daily routine', () => {
    describe('When listTodayRoutines is called for user A', () => {
      it('Then user B routine never appears', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(routines).values([
            { userId: a.id, title: 'A', cadenceType: 'daily' },
            { userId: b.id, title: 'B', cadenceType: 'daily' },
          ]);
          const rows = await listTodayRoutines(a.id, todayInTaipei(), tx);
          expect(rows.map((r) => r.routine.title)).toEqual(['A']);
        });
      });
    });
  });
});
```

- [ ] **Step 6.2: Run — confirm RED**

Run: `pnpm test:integration -- today`
Expected: FAIL — `Cannot find module '@/services/today'`.

- [ ] **Step 6.3: Commit failing test**

```bash
git add tests/integration/services/today.test.ts
git commit -m "test(services): add failing listTodayRoutines tests"
```

- [ ] **Step 6.4: Implement `src/services/today.ts`**

```ts
import { and, asc, eq, gte, isNull } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, routines, routineLogs, type Routine, type RoutineLog } from '@/db/schema';
import { appliesOn, type RoutineCadence } from '@/domain/cadence';
import {
  build30DayHeatmap,
  streakLength,
  type HeatmapCellStatus,
  type StreakLog,
} from '@/domain/streak';

export type TodayRoutineRow = {
  routine: Routine;
  goalTitle: string | null;
  todayLog: RoutineLog | null;
  heatmap: Array<{ date: string; status: HeatmapCellStatus }>;
  streak: number;
};

export async function listTodayRoutines(
  userId: string,
  today: string,
  db: DbOrTx = defaultDb,
): Promise<TodayRoutineRow[]> {
  const since = new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Step 1: pull the user's non-archived routines + parent goal title.
  const routineRows = await db
    .select({
      routine: routines,
      goalTitle: goals.title,
    })
    .from(routines)
    .leftJoin(goals, eq(goals.id, routines.goalId))
    .where(and(eq(routines.userId, userId), isNull(routines.archivedAt)))
    .orderBy(asc(routines.createdAt));

  // Step 2: pull all logs from the last 30 days for those routines.
  const allLogs = await db
    .select()
    .from(routineLogs)
    .innerJoin(
      routines,
      and(eq(routines.id, routineLogs.routineId), eq(routines.userId, userId)),
    )
    .where(gte(routineLogs.logDate, since))
    .orderBy(asc(routineLogs.logDate));

  const logsByRoutine = new Map<string, RoutineLog[]>();
  for (const { routine_logs: log } of allLogs) {
    const arr = logsByRoutine.get(log.routineId) ?? [];
    arr.push(log);
    logsByRoutine.set(log.routineId, arr);
  }

  // Step 3: filter by cadence applying today, then assemble.
  const result: TodayRoutineRow[] = [];
  for (const { routine, goalTitle } of routineRows) {
    const cadence: RoutineCadence = {
      cadenceType: routine.cadenceType as 'daily' | 'weekdays',
      weekdays: routine.weekdays ?? null,
    };
    if (!appliesOn(cadence, today)) continue;

    const logs = logsByRoutine.get(routine.id) ?? [];
    const streakLogs: StreakLog[] = logs.map((l) => ({
      logDate: l.logDate,
      status: l.status as 'done' | 'partial' | 'skipped',
    }));
    const applies = (date: string) => appliesOn(cadence, date);
    const todayLog = logs.find((l) => l.logDate === today) ?? null;

    result.push({
      routine,
      goalTitle: goalTitle ?? null,
      todayLog,
      heatmap: build30DayHeatmap(streakLogs, today, applies),
      streak: streakLength(streakLogs, today, applies),
    });
  }
  return result;
}
```

- [ ] **Step 6.5: Run — confirm GREEN**

Run: `pnpm test:integration -- today`
Expected: PASS — 4/4.

If the destructure `const { routine_logs: log }` fails (Drizzle's table-key naming), inspect the actual returned shape with one debug `console.log` and adjust the property name to match what your Drizzle version emits (commonly `routineLogs` or `routine_logs`).

- [ ] **Step 6.6: Commit implementation**

```bash
git add src/services/today.ts
git commit -m "feat(services): add listTodayRoutines aggregator"
```

---

## Task 7: Server actions — `routines.actions.ts` + `routine_logs.actions.ts`

Implements design D6. Three server actions: `createRoutineAction`, `archiveRoutineAction`, `setRoutineStatusAction`. All call `auth()`; all call `revalidatePath('/today')`.

**Files:**
- Create: `src/services/routines.actions.ts`
- Create: `src/services/routine_logs.actions.ts`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `09-revalidating.md` first. Confirm `'use server'` lives at the top of each file (module-level).

- [ ] **Step 7.1: Implement `src/services/routines.actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import * as svc from './routines';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  return session.user.id;
}

export type CreateRoutineActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createRoutineAction(
  _prev: CreateRoutineActionState,
  formData: FormData,
): Promise<CreateRoutineActionState> {
  const userId = await requireUserId();

  const cadenceType = String(formData.get('cadenceType') ?? '');
  const goalIdRaw = String(formData.get('goalId') ?? '').trim();
  const weekdaysRaw = formData.getAll('weekdays').map((v) => Number(String(v)));

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    cadenceType: cadenceType === 'weekdays' ? 'weekdays' : 'daily',
    goalId: goalIdRaw === '' ? null : goalIdRaw,
    weekdays:
      cadenceType === 'weekdays'
        ? weekdaysRaw.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        : undefined,
  };

  try {
    const created = await svc.createRoutine(raw, userId);
    revalidatePath('/today');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create routine',
    };
  }
}

export async function archiveRoutineAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.archiveRoutine(id, userId);
  revalidatePath('/today');
}
```

- [ ] **Step 7.2: Implement `src/services/routine_logs.actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { SetRoutineStatusSchema } from '@/lib/zod/routines';
import { setRoutineStatus } from './routine_logs';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  return session.user.id;
}

export type SetStatusResult =
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function setRoutineStatusAction(
  routineId: string,
  date: string,
  status: 'done' | 'partial' | 'skipped' | null,
): Promise<SetStatusResult> {
  const userId = await requireUserId();
  const parsed = SetRoutineStatusSchema.safeParse({ routineId, date, status });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'invalid input' };
  }
  try {
    await setRoutineStatus(parsed.data.routineId, userId, parsed.data.date, parsed.data.status);
    revalidatePath('/today');
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not update status',
    };
  }
}
```

- [ ] **Step 7.3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean. (The page in Task 9 will reference these but the page doesn't exist yet — typecheck for the actions alone should still pass.)

- [ ] **Step 7.4: Commit**

```bash
git add src/services/routines.actions.ts src/services/routine_logs.actions.ts
git commit -m "feat(services): add routines + routine_logs server actions"
```

---

## Task 8: Components — `<Heatmap30>`, `<RoutineRow>`, `<RoutinesGroupedByGoal>`, `<ArchiveRoutineButton>`, `<StatusCycleButton>` (with RTL test)

Implements spec requirements "Status cycle button persists state", "30-day heatmap rendered server-side", "Routines group by goal", "Routine archival is idempotent and user-scoped" (UI side). Implements design D8.

**Files:**
- Create: `src/components/routines/Heatmap30.tsx`
- Create: `src/components/routines/RoutineRow.tsx`
- Create: `src/components/routines/RoutinesGroupedByGoal.tsx`
- Create: `src/components/routines/ArchiveRoutineButton.tsx`
- Create: `src/components/routines/StatusCycleButton.tsx`
- Create: `tests/unit/components/routines/StatusCycleButton.test.tsx`

- [ ] **Step 8.1: Implement `src/components/routines/Heatmap30.tsx` (RSC)**

```tsx
import type { HeatmapCellStatus } from '@/domain/streak';

const COLOR: Record<HeatmapCellStatus, string> = {
  done: 'bg-emerald-500',
  partial: 'bg-amber-400',
  skipped: 'bg-zinc-300',
  none: 'bg-zinc-100',
  na: 'bg-transparent',
};

type Props = {
  cells: Array<{ date: string; status: HeatmapCellStatus }>;
};

export function Heatmap30({ cells }: Props) {
  return (
    <div
      className="flex gap-[2px]"
      role="img"
      aria-label="30-day status heatmap, oldest on the left"
    >
      {cells.map((c) => (
        <span
          key={c.date}
          className={`h-3 w-3 rounded-sm ${COLOR[c.status]}`}
          title={`${c.date} — ${c.status}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 8.2: Write the failing RTL test for `<StatusCycleButton>`**

Create `tests/unit/components/routines/StatusCycleButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusCycleButton } from '@/components/routines/StatusCycleButton';

const action = vi.fn(async () => ({ status: 'ok' as const }));

describe('StatusCycleButton', () => {
  beforeEach(() => {
    action.mockClear();
  });

  describe('Given current status is null (unset)', () => {
    describe('When clicked once', () => {
      it('Then calls action with status=done and reflects "done"', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus={null}
            actionFn={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'done');
        expect(screen.getByRole('button')).toHaveTextContent(/done/i);
      });
    });
  });

  describe('Given current status is done', () => {
    describe('When clicked', () => {
      it('Then calls action with status=partial', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="done"
            actionFn={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'partial');
      });
    });
  });

  describe('Given current status is partial', () => {
    describe('When clicked', () => {
      it('Then calls action with status=skipped', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="partial"
            actionFn={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'skipped');
      });
    });
  });

  describe('Given current status is skipped', () => {
    describe('When clicked', () => {
      it('Then calls action with status=null (clears the log)', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="skipped"
            actionFn={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', null);
      });
    });
  });
});
```

> Note: `@testing-library/user-event` should already be installed from foundation Task 14 (used by goals tests). If `pnpm test:unit -- StatusCycleButton` errors with "cannot resolve @testing-library/user-event", run `pnpm add -D @testing-library/user-event` and commit the lockfile change separately.

- [ ] **Step 8.3: Run — confirm RED**

Run: `pnpm test:unit -- StatusCycleButton`
Expected: FAIL — `Cannot find module '@/components/routines/StatusCycleButton'`.

- [ ] **Step 8.4: Implement `src/components/routines/StatusCycleButton.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';

export type CycleStatus = 'done' | 'partial' | 'skipped' | null;

const NEXT: Record<string, CycleStatus> = {
  null: 'done',
  done: 'partial',
  partial: 'skipped',
  skipped: null,
};

const LABEL: Record<string, string> = {
  null: 'Mark done',
  done: 'Done',
  partial: 'Partial',
  skipped: 'Skipped',
};

const COLOR: Record<string, string> = {
  null: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  done: 'bg-emerald-500 text-white hover:bg-emerald-600',
  partial: 'bg-amber-400 text-zinc-900 hover:bg-amber-500',
  skipped: 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400',
};

type ActionFn = (
  routineId: string,
  date: string,
  status: CycleStatus,
) => Promise<{ status: 'ok' } | { status: 'error'; message: string }>;

type Props = {
  routineId: string;
  date: string;
  initialStatus: CycleStatus;
  actionFn: ActionFn;
};

export function StatusCycleButton({ routineId, date, initialStatus, actionFn }: Props) {
  const [optimistic, setOptimistic] = useState<CycleStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const next = NEXT[String(optimistic)];
    const prev = optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await actionFn(routineId, date, next);
      if (result.status === 'error') setOptimistic(prev); // rollback
    });
  }

  const key = String(optimistic);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Status: ${LABEL[key]}. Click to cycle.`}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${COLOR[key]} disabled:opacity-60`}
    >
      {LABEL[key]}
    </button>
  );
}
```

- [ ] **Step 8.5: Run — confirm GREEN**

Run: `pnpm test:unit -- StatusCycleButton`
Expected: PASS — 4/4.

- [ ] **Step 8.6: Implement `src/components/routines/ArchiveRoutineButton.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { archiveRoutineAction } from '@/services/routines.actions';

type Props = { id: string };

export function ArchiveRoutineButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await archiveRoutineAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Archive
      </Button>
    </form>
  );
}
```

- [ ] **Step 8.7: Implement `src/components/routines/RoutineRow.tsx` (RSC)**

```tsx
import type { TodayRoutineRow } from '@/services/today';
import { setRoutineStatusAction } from '@/services/routine_logs.actions';
import { StatusCycleButton, type CycleStatus } from './StatusCycleButton';
import { Heatmap30 } from './Heatmap30';
import { ArchiveRoutineButton } from './ArchiveRoutineButton';

type Props = {
  row: TodayRoutineRow;
  today: string;
};

export function RoutineRow({ row, today }: Props) {
  const initialStatus = (row.todayLog?.status ?? null) as CycleStatus;
  return (
    <li className="flex items-center justify-between gap-4 rounded border border-zinc-200 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <StatusCycleButton
            routineId={row.routine.id}
            date={today}
            initialStatus={initialStatus}
            actionFn={setRoutineStatusAction}
          />
          <span className="truncate font-medium">{row.routine.title}</span>
          <span className="ml-auto text-xs text-zinc-500">streak: {row.streak}</span>
        </div>
        <div className="mt-2">
          <Heatmap30 cells={row.heatmap} />
        </div>
      </div>
      <ArchiveRoutineButton id={row.routine.id} />
    </li>
  );
}
```

- [ ] **Step 8.8: Implement `src/components/routines/RoutinesGroupedByGoal.tsx` (RSC)**

```tsx
import type { TodayRoutineRow } from '@/services/today';
import { RoutineRow } from './RoutineRow';

type Props = {
  rows: TodayRoutineRow[];
  today: string;
};

export function RoutinesGroupedByGoal({ rows, today }: Props) {
  // Map goalTitle (or "General") → rows, preserving first-seen order.
  const groups = new Map<string, TodayRoutineRow[]>();
  for (const r of rows) {
    const key = r.goalTitle ?? 'General';
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([title, group]) => (
        <section key={title}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {title}
          </h2>
          <ul className="space-y-2">
            {group.map((row) => (
              <RoutineRow key={row.routine.id} row={row} today={today} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 8.9: Verify typecheck (don't commit yet — Task 9 forms a coherent batch with 10)**

Run: `pnpm typecheck`
Expected: clean for everything written so far.

- [ ] **Step 8.10: Commit Task 8 (components form a self-contained set; tests pass)**

```bash
git add src/components/routines/Heatmap30.tsx src/components/routines/StatusCycleButton.tsx src/components/routines/ArchiveRoutineButton.tsx src/components/routines/RoutineRow.tsx src/components/routines/RoutinesGroupedByGoal.tsx tests/unit/components/routines/StatusCycleButton.test.tsx
git commit -m "feat(routines): add Heatmap30, RoutineRow, StatusCycleButton (+ tests)"
```

---

## Task 9: Components — `<CreateRoutineForm>` + `<CreateRoutineDialog>`

Implements spec requirement "Routine creation form" (UI side). Mirrors the goals precedent at `src/components/goals/CreateGoalForm.tsx` and `CreateGoalDialog.tsx`. Conditional weekday checkboxes when cadence is `weekdays`.

**Files:**
- Create: `src/components/routines/CreateRoutineForm.tsx`
- Create: `src/components/routines/CreateRoutineDialog.tsx`

- [ ] **Step 9.1: Implement `src/components/routines/CreateRoutineForm.tsx` (`'use client'`)**

```tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createRoutineAction,
  type CreateRoutineActionState,
} from '@/services/routines.actions';

const initialState: CreateRoutineActionState = { status: 'idle' };

const WEEKDAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

type Props = {
  goalOptions?: Array<{ id: string; title: string }>;
  onSuccessAction?: () => void;
};

export function CreateRoutineForm({ goalOptions = [], onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(createRoutineAction, initialState);
  const [cadence, setCadence] = useState<'daily' | 'weekdays'>('daily');

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} autoFocus />
      </div>

      {goalOptions.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="goalId">Goal (optional)</Label>
          <select
            id="goalId"
            name="goalId"
            defaultValue=""
            className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">— None (General) —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      ) : null}

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Cadence</legend>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="cadenceType"
            value="daily"
            checked={cadence === 'daily'}
            onChange={() => setCadence('daily')}
          />
          Daily
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="cadenceType"
            value="weekdays"
            checked={cadence === 'weekdays'}
            onChange={() => setCadence('weekdays')}
          />
          Specific weekdays
        </label>
      </fieldset>

      {cadence === 'weekdays' ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Weekdays</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map(({ value, label }) => (
              <label key={value} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekdays" value={value} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create routine'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 9.2: Implement `src/components/routines/CreateRoutineDialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreateRoutineForm } from './CreateRoutineForm';

type Props = {
  goalOptions?: Array<{ id: string; title: string }>;
};

export function CreateRoutineDialog({ goalOptions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New routine</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new routine</DialogTitle>
        </DialogHeader>
        <CreateRoutineForm
          goalOptions={goalOptions}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9.3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 9.4: Commit**

```bash
git add src/components/routines/CreateRoutineForm.tsx src/components/routines/CreateRoutineDialog.tsx
git commit -m "feat(routines): add CreateRoutineForm + Dialog with conditional weekdays"
```

---

## Task 10: Page — `/today` RSC + root redirect

Implements spec requirements "Today page lists applicable routines", "Routines group by goal", "Default landing page is `/today`".

**Files:**
- Replace: `app/(app)/today/page.tsx`
- Modify or create: `app/(app)/page.tsx` (root inside the authenticated group)

- [ ] **Step 10.1: Replace `app/(app)/today/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { todayInTaipei } from '@/domain/taipei';
import { listTodayRoutines } from '@/services/today';
import { listActiveGoals } from '@/services/goals';
import { RoutinesGroupedByGoal } from '@/components/routines/RoutinesGroupedByGoal';
import { CreateRoutineDialog } from '@/components/routines/CreateRoutineDialog';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const today = todayInTaipei();
  const [rows, goals] = await Promise.all([
    listTodayRoutines(session.user.id, today),
    listActiveGoals(session.user.id),
  ]);

  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today</h1>
        <CreateRoutineDialog goalOptions={goalOptions} />
      </header>
      {rows.length === 0 ? (
        <p className="text-zinc-600">
          No routines apply today. Create one to get started.
        </p>
      ) : (
        <RoutinesGroupedByGoal rows={rows} today={today} />
      )}
    </section>
  );
}
```

- [ ] **Step 10.2: Add or update `app/(app)/page.tsx` to redirect to `/today`**

If the file does not exist:

```tsx
import { redirect } from 'next/navigation';

export default function AppRoot() {
  redirect('/today');
}
```

If the file exists and currently redirects to `/goals`, change `/goals` → `/today`. If it doesn't exist and the project's authenticated root currently lives at `app/page.tsx`, edit that one instead. Verify with `ls app/page.tsx app/\(app\)/page.tsx 2>/dev/null` first.

- [ ] **Step 10.3: Verify lint, typecheck, build**

Run each separately:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: every command exits 0. `next build` reports `/today` as a dynamic route, no compilation errors.

- [ ] **Step 10.4: Commit**

```bash
git add app/\(app\)/today/page.tsx app/\(app\)/page.tsx
git commit -m "feat(today): add /today RSC + redirect root to /today"
```

(If you only changed `app/page.tsx`, stage that path instead.)

---

## Task 11: Acceptance walk-through + final verification

- [ ] **Step 11.1: Make sure local Postgres is up**

Run: `docker compose ps`
Expected: `goal-tree-db` is `(healthy)` on `127.0.0.1:5433->5432`. If not: `docker compose up -d db`.

- [ ] **Step 11.2: Apply migrations (idempotent)**

Run: `pnpm db:migrate`
Expected: no pending migrations (schema unchanged in this PR).

- [ ] **Step 11.3: Run the full check suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Expected: every command exits 0. Unit suite shows new `cadence` (7), `streak` (11), `routines zod` (12), `StatusCycleButton` (4) tests passing alongside existing tests. Integration suite shows new `routines` (9), `routine_logs` (9), `today` (4) tests passing alongside existing.

- [ ] **Step 11.4: Manual UI walk (requires real GitHub OAuth + valid `.env.local`)**

Run: `pnpm dev`. In a browser:

1. Visit `/` → redirected to `/today` (or `/signin` if not signed in).
2. Sign in. Land on `/today` empty state ("No routines apply today. Create one to get started.") + "New routine" button.
3. Click "New routine". Submit `{title: 'Read 30 min', cadence: daily}`. → Row appears with grey "Mark done" cycle button and a 30-cell heatmap of mostly grey "none" cells.
4. Click the cycle button on that row. → Button becomes green "Done", today's heatmap cell becomes green, streak shows 1.
5. Click again → "Partial" amber. Click again → "Skipped" grey-darker. Click again → back to "Mark done", today's log row deleted.
6. Click "New routine" again. Submit `{title: 'Run', cadence: weekdays, weekdays: [1,3,5]}`. → Row appears (assuming today is Mon/Wed/Fri Taipei) OR it doesn't appear (other days). Verify by changing system day if curious; otherwise just inspect via psql.
7. Click "New routine" again. Submit `{title: 'Standalone', cadence: daily}` with no goal. → Row appears under "General" group.
8. Optional: create a goal at `/goals` first, then a routine linked to it, then verify it groups under the goal title on `/today`.
9. Click "Archive" on a routine → it disappears from the list. Verify in psql: `select archived_at from routines;` — has timestamp.
10. Open psql to insert a backfilled `done` log for yesterday on the `Read 30 min` routine:

    ```bash
    docker exec -it goal-tree-db psql -U postgres -d goal_tree
    ```

    ```sql
    insert into routine_logs (routine_id, log_date, status)
    values ('<ID>', current_date - interval '1 day', 'done');
    ```

    Refresh `/today`. → Streak now shows 2 (today + yesterday), heatmap reflects.
11. Sign out → redirected to `/signin`. Visit `/today` while signed out → redirected to `/signin` (proxy enforces).

- [ ] **Step 11.5: Update README only if a developer-facing command changed**

For this feature, no script changes are expected. Skip unless something actually changed.

- [ ] **Step 11.6: Final status**

```bash
git log --oneline dev..HEAD
git status
```

Confirm: each task above is reflected as expected commits, no surprise commits, working tree clean.

- [ ] **Step 11.7: Open the PR via `gh-pr` skill**

The user will invoke `gh-pr` separately — your job ends here.

---

## Self-Review Notes (done before this file was saved)

**Spec coverage**

| Spec requirement | Task(s) |
|---|---|
| Today page lists applicable routines (cadence + active + own user) | 1 (`appliesOn`), 4 (`listActiveRoutines`), 6 (`listTodayRoutines` filter), 10 (page) |
| Routines group by goal (incl. "General") | 6 (`goalTitle` carried in shape), 8 (`RoutinesGroupedByGoal`), 10 (page wiring) |
| Status cycle button persists state | 5 (`setRoutineStatus` upsert/delete), 7 (`setRoutineStatusAction`), 8 (`StatusCycleButton` + RTL test) |
| Backfill window enforced server-side | 5 (action calls `isWithinBackfillWindow`, integration test for today/-2/-3/future), 7 (action layer) |
| Streak count shown per routine | 2 (`streakLength`), 6 (aggregator computes), 8 (rendered in `RoutineRow`) |
| 30-day heatmap rendered server-side | 2 (`build30DayHeatmap`), 6 (aggregator computes), 8 (`Heatmap30` RSC) |
| Routine creation form (Zod, conditional weekdays, goal optional) | 3 (Zod), 4 (repo), 7 (action), 9 (form + dialog), 10 (page wires options) |
| Routine archival idempotent + user-scoped | 4 (repo + tests for owner/already-archived/cross-user), 7 (action), 8 (`ArchiveRoutineButton`) |
| Default landing page is `/today` | 10 (root redirect) |

**Placeholder scan:** none — every code step shows complete code, no "TODO/TBD/similar to/etc.".

**Type/name consistency:**

- Repo functions: `createRoutine`, `listActiveRoutines`, `getRoutine`, `archiveRoutine` (Tasks 4, 7, 8). `setRoutineStatus`, `listLogsForLast30Days` (Tasks 5, 6, 7).
- Aggregator: `listTodayRoutines` returning `TodayRoutineRow[]` shape `{ routine, goalTitle, todayLog, heatmap, streak }` (Task 6, consumed by Tasks 8, 10).
- Server actions: `createRoutineAction`/`archiveRoutineAction` (Task 7) match component imports (Tasks 8, 9). `setRoutineStatusAction` (Task 7) matches `<StatusCycleButton actionFn={...}>` signature (Task 8).
- Domain: `appliesOn(routine, date)` (Task 1) reused by Tasks 2 (via `applies` predicate parameter) and Task 6.
- Cell-status union `'done'|'partial'|'skipped'|'none'|'na'` exported as `HeatmapCellStatus` from `src/domain/streak.ts` (Task 2), consumed by `<Heatmap30>` (Task 8) and `listTodayRoutines` (Task 6).
- Cycle status union `'done'|'partial'|'skipped'|null` (the `CycleStatus` type) consistent across `<StatusCycleButton>` (Task 8), `setRoutineStatusAction` signature (Task 7), and `setRoutineStatus` (Task 5).

**Known intermediate breakage:** Task 7 (server actions) is committed before Task 8 (which imports them) and Task 10 (page). The action files compile standalone since they only depend on Tasks 4–6 services + the Zod schema from Task 3. Task 8 depends on Task 7 for the import, so commit-by-commit `pnpm typecheck` should remain green from Task 7 onward. The only potential intermediate red is if the `Routine.cadenceType` column type from Drizzle infers as `string` rather than the `'daily'|'weekdays'` literal — Task 6 casts explicitly to handle that. Task 11.3 is the final gate.
