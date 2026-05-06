# Goals & Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/goals` (gated): list active goals with deadline countdown that switches between calendar-day badge, live `Xh Ym` ticker (≤1d), and red `Overdue Nd`; with create-goal dialog and archive action — all behind Auth.js, scoped per user, fully TDD'd.

**Architecture:** Pure-domain countdown math in `src/domain/countdown.ts` (no I/O, unit-tested). Repo functions in `src/services/goals.ts` accept an injected `DbOrTx` so integration tests run inside `withRollback`. Server actions (in `src/services/goals.actions.ts` with `'use server'` directive) wrap repo calls with `auth()` + `revalidatePath('/goals')`. RSC page renders the list; only the live ticker is a client component.

**Tech Stack:** Next 16.2.4 (App Router, RSC + server actions, `revalidatePath`), React 19.2.4 (`useActionState`), Drizzle ORM (postgres-js driver), Auth.js v5, Zod 4, Tailwind 4, shadcn/ui (`Button`, `Card`, `Input`, `Label`, plus new `Dialog`, `Textarea`, `Badge`), Vitest 4 (unit project = happy-dom, integration project = node + `fileParallelism: false`), pnpm.

**Reference:**
- openspec proposal: `openspec/changes/goals-and-countdown/proposal.md`
- openspec design (D1–D10): `openspec/changes/goals-and-countdown/design.md`
- openspec spec (8 requirements): `openspec/changes/goals-and-countdown/specs/goals/spec.md`
- openspec tasks (skeleton): `openspec/changes/goals-and-countdown/tasks.md`
- upstream spec: `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md` §5.1
- GitHub issue: https://github.com/chienchuanw/goal-tree/issues/1

> ⚠️ **Next 16 caveat:** Before writing the server actions in Task 5 or the RSC in Task 6, read at minimum:
> - `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — `'use server'` placement, server-action call patterns
> - `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` — when/how to call `revalidatePath`
> - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
> - `node_modules/next/dist/docs/01-app/02-guides/forms.md` — form patterns + `useActionState`
>
> Do NOT trust prior-version Next memory. The middleware→proxy rename (already in this repo) is one example of the breaking changes.

---

## File Structure (created or modified by this plan)

```
src/
  domain/
    countdown.ts                                 ← NEW: daysUntil, hoursMinutesUntil (pure)
  db/
    client.ts                                    ← MODIFY: export Tx + DbOrTx types
  lib/
    zod/
      goals.ts                                   ← NEW: CreateGoalSchema (Zod 4)
  services/
    goals.ts                                     ← NEW: listActiveGoals, getGoal, createGoal, archiveGoal (repo)
    goals.actions.ts                             ← NEW: 'use server' wrappers (auth + revalidatePath)
  components/
    ui/
      dialog.tsx                                 ← NEW (shadcn add)
      textarea.tsx                               ← NEW (shadcn add)
      badge.tsx                                  ← NEW (shadcn add)
    goals/
      GoalCard.tsx                               ← NEW: RSC card (badge OR ticker)
      CountdownBadge.tsx                         ← NEW: pure-RSC static badge ("Nd" / "Overdue Nd")
      HoursCountdown.tsx                         ← NEW: 'use client' 60s ticker
      CreateGoalDialog.tsx                       ← NEW: trigger + Dialog wrapper
      CreateGoalForm.tsx                         ← NEW: form bound to createGoalAction
      ArchiveGoalButton.tsx                      ← NEW: form bound to archiveGoalAction

app/
  (app)/
    goals/
      page.tsx                                   ← REPLACE placeholder with real RSC

tests/
  unit/
    domain/
      countdown.test.ts                          ← NEW
    lib/
      zod/
        goals.test.ts                            ← NEW
    components/
      goals/
        HoursCountdown.test.tsx                  ← NEW (RTL + fake timers)
  integration/
    services/
      goals.test.ts                              ← NEW (uses withRollback + seedUser)
```

**Naming consistency contract** (verified against later tasks before any are written):
- Repo functions in `src/services/goals.ts`: `listActiveGoals(userId, db?)`, `getGoal(id, userId, db?)`, `createGoal(input, userId, db?)`, `archiveGoal(id, userId, db?)`.
- Server-action wrappers in `src/services/goals.actions.ts`: `createGoalAction(formData)`, `archiveGoalAction(id)`.
- Domain functions in `src/domain/countdown.ts`: `daysUntil(deadlineAt, now, tz?)`, `hoursMinutesUntil(deadlineAt, now)`.
- Zod schema: `CreateGoalSchema` (and inferred type `CreateGoalInput`).
- Components: `<GoalCard>`, `<CountdownBadge>`, `<HoursCountdown>`, `<CreateGoalDialog>`, `<CreateGoalForm>`, `<ArchiveGoalButton>`.

---

## Task 1: Domain — `daysUntil` + `hoursMinutesUntil` (pure, TDD)

Implements spec requirements: "Asia/Taipei calendar-day math", "Hours/minutes ticker math". Implements design D2 (UTC stored, Taipei rendered) and D3 (calendar-day delta, not floor of hours/24).

**Files:**
- Create: `tests/unit/domain/countdown.test.ts`
- Create: `src/domain/countdown.ts`

- [ ] **Step 1.1: Write the failing unit tests**

Create `tests/unit/domain/countdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { daysUntil, hoursMinutesUntil } from '@/domain/countdown';
import { TAIPEI_TZ } from '@/domain/taipei';

describe('daysUntil', () => {
  describe('Given a deadline 23 calendar days ahead in Asia/Taipei', () => {
    describe('When called with default timezone', () => {
      it('Then returns 23', () => {
        const now = new Date('2026-05-05T04:00:00Z'); // 12:00 Taipei 2026-05-05
        const deadline = new Date('2026-05-28T04:00:00Z'); // 12:00 Taipei 2026-05-28
        expect(daysUntil(deadline, now)).toBe(23);
      });
    });
  });

  describe('Given the deadline and now fall on the same Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns 0', () => {
        const now = new Date('2026-05-05T04:00:00Z'); // Taipei 12:00
        const deadline = new Date('2026-05-05T15:30:00Z'); // Taipei 23:30 same day
        expect(daysUntil(deadline, now)).toBe(0);
      });
    });
  });

  describe('Given the deadline is the next Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns 1', () => {
        // now = 2026-05-04T15:30:00Z = Taipei 2026-05-04 23:30
        // deadline = 2026-05-04T16:30:00Z = Taipei 2026-05-05 00:30
        const now = new Date('2026-05-04T15:30:00Z');
        const deadline = new Date('2026-05-04T16:30:00Z');
        expect(daysUntil(deadline, now)).toBe(1);
      });
    });
  });

  describe('Given the deadline resolved to an earlier Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns a negative integer equal to the calendar-day delta', () => {
        const now = new Date('2026-05-05T04:00:00Z'); // Taipei 12:00 5/5
        const deadline = new Date('2026-05-03T04:00:00Z'); // Taipei 12:00 5/3
        expect(daysUntil(deadline, now)).toBe(-2);
      });
    });
  });

  describe('Given an explicit Asia/Taipei timezone parameter', () => {
    describe('When called with TAIPEI_TZ', () => {
      it('Then matches the default-tz behavior', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date('2026-05-28T04:00:00Z');
        expect(daysUntil(deadline, now, TAIPEI_TZ)).toBe(23);
      });
    });
  });
});

describe('hoursMinutesUntil', () => {
  describe('Given exactly 4 hours and 23 minutes remaining', () => {
    describe('When called', () => {
      it('Then returns { hours: 4, minutes: 23 }', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date(now.getTime() + (4 * 60 + 23) * 60_000);
        expect(hoursMinutesUntil(deadline, now)).toEqual({ hours: 4, minutes: 23 });
      });
    });
  });

  describe('Given the deadline is exactly now', () => {
    describe('When called', () => {
      it('Then returns { hours: 0, minutes: 0 }', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        expect(hoursMinutesUntil(now, now)).toEqual({ hours: 0, minutes: 0 });
      });
    });
  });

  describe('Given the deadline is in the past', () => {
    describe('When called', () => {
      it('Then clamps both fields to zero', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date(now.getTime() - 60 * 60_000);
        expect(hoursMinutesUntil(deadline, now)).toEqual({ hours: 0, minutes: 0 });
      });
    });
  });
});
```

- [ ] **Step 1.2: Run the tests — confirm RED**

Run: `pnpm test:unit -- countdown`
Expected: FAIL — `Cannot find module '@/domain/countdown'`.

- [ ] **Step 1.3: Commit the failing tests**

```bash
git add tests/unit/domain/countdown.test.ts
git commit -m "test(domain): add failing countdown tests"
```

- [ ] **Step 1.4: Implement `src/domain/countdown.ts`**

```ts
import { TAIPEI_TZ } from './taipei';

const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function dayInTz(d: Date, tz: string): string {
  let fmt = FORMATTER_CACHE.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    FORMATTER_CACHE.set(tz, fmt);
  }
  return fmt.format(d);
}

/**
 * Calendar-day delta between `deadlineAt` and `now` in the given IANA timezone.
 * Positive: deadline is in the future. Negative: deadline already passed.
 * Defaults to Asia/Taipei.
 */
export function daysUntil(
  deadlineAt: Date,
  now: Date,
  tz: string = TAIPEI_TZ,
): number {
  const a = Date.parse(dayInTz(deadlineAt, tz) + 'T00:00:00Z');
  const b = Date.parse(dayInTz(now, tz) + 'T00:00:00Z');
  return Math.round((a - b) / 86_400_000);
}

/**
 * Wall-clock hours/minutes remaining until `deadlineAt`.
 * Both fields clamp to 0 when `deadlineAt <= now`.
 */
export function hoursMinutesUntil(
  deadlineAt: Date,
  now: Date,
): { hours: number; minutes: number } {
  const ms = deadlineAt.getTime() - now.getTime();
  if (ms <= 0) return { hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}
```

- [ ] **Step 1.5: Run the tests — confirm GREEN**

Run: `pnpm test:unit -- countdown`
Expected: PASS — 8/8.

- [ ] **Step 1.6: Commit the implementation**

```bash
git add src/domain/countdown.ts
git commit -m "feat(domain): add daysUntil + hoursMinutesUntil for Taipei calendar"
```

---

## Task 2: Zod schema — `CreateGoalSchema` (TDD)

Implements spec requirement: "Create goal action" (input validation rules: title 1–200 chars, optional description ≤2000 chars, deadline must be a future ISO datetime). Implements design D6.

**Files:**
- Create: `tests/unit/lib/zod/goals.test.ts`
- Create: `src/lib/zod/goals.ts`

- [ ] **Step 2.1: Write the failing unit tests**

Create `tests/unit/lib/zod/goals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreateGoalSchema } from '@/lib/zod/goals';

const futureIso = () => new Date(Date.now() + 7 * 86_400_000).toISOString();
const pastIso = () => new Date(Date.now() - 86_400_000).toISOString();

describe('CreateGoalSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then returns a typed object with deadlineAt as a Date', () => {
        const result = CreateGoalSchema.parse({
          title: 'Pass JLPT N3',
          description: 'Listening + grammar focus',
          deadlineAt: futureIso(),
        });
        expect(result.title).toBe('Pass JLPT N3');
        expect(result.description).toBe('Listening + grammar focus');
        expect(result.deadlineAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given a missing description', () => {
    describe('When parsed', () => {
      it('Then accepts and yields description as undefined', () => {
        const result = CreateGoalSchema.parse({
          title: 'Pass JLPT N3',
          deadlineAt: futureIso(),
        });
        expect(result.description).toBeUndefined();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({ title: '', deadlineAt: futureIso() }),
        ).toThrow();
      });
    });
  });

  describe('Given a title longer than 200 characters', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({
            title: 'x'.repeat(201),
            deadlineAt: futureIso(),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a description longer than 2000 characters', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({
            title: 'ok',
            description: 'x'.repeat(2001),
            deadlineAt: futureIso(),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a deadline already in the past', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({ title: 'ok', deadlineAt: pastIso() }),
        ).toThrow();
      });
    });
  });
});
```

- [ ] **Step 2.2: Run — confirm RED**

Run: `pnpm test:unit -- goals`
Expected: FAIL — `Cannot find module '@/lib/zod/goals'`.

- [ ] **Step 2.3: Implement `src/lib/zod/goals.ts`**

```ts
import { z } from 'zod';

export const CreateGoalSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    deadlineAt: z
      .string()
      .datetime({ offset: true })
      .transform((s) => new Date(s)),
  })
  .refine((v) => v.deadlineAt.getTime() > Date.now(), {
    message: 'deadlineAt must be in the future',
    path: ['deadlineAt'],
  });

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
```

- [ ] **Step 2.4: Run — confirm GREEN**

Run: `pnpm test:unit -- goals`
Expected: PASS — 6/6.

- [ ] **Step 2.5: Commit (single commit since red→green is one short loop)**

```bash
git add tests/unit/lib/zod/goals.test.ts src/lib/zod/goals.ts
git commit -m "feat(lib/zod): add CreateGoalSchema with future-deadline refinement"
```

---

## Task 3: shadcn primitives — `dialog`, `textarea`, `badge`

Implements design D8.

**Files:**
- Create: `src/components/ui/dialog.tsx` (via shadcn CLI)
- Create: `src/components/ui/textarea.tsx` (via shadcn CLI)
- Create: `src/components/ui/badge.tsx` (via shadcn CLI)
- Modify: `package.json`, `pnpm-lock.yaml` (CLI may add Radix deps)

- [ ] **Step 3.1: Add the three primitives non-interactively**

Run: `pnpm dlx shadcn@latest add dialog textarea badge`
Expected: writes `src/components/ui/dialog.tsx`, `textarea.tsx`, `badge.tsx`. May add Radix deps (`@radix-ui/react-dialog`).

- [ ] **Step 3.2: Verify file locations**

Run: `ls src/components/ui/`
Expected output includes: `badge.tsx button.tsx card.tsx dialog.tsx input.tsx label.tsx textarea.tsx`.

If any file landed under `components/ui/` (without `src/`), move it: `mv components/ui/<file>.tsx src/components/ui/<file>.tsx && rmdir components/ui components 2>/dev/null || true`. Verify `components.json` has `"components": "@/components"` (it should, from foundation Task 14).

- [ ] **Step 3.3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean (no errors).

- [ ] **Step 3.4: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/textarea.tsx src/components/ui/badge.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): add shadcn dialog, textarea, badge primitives"
```

---

## Task 4: Repo layer — extend db client with `Tx` / `DbOrTx` types

Implements design D5/D7 plumbing — services must accept either the production `db` or a transaction object so `withRollback` works.

**Files:**
- Modify: `src/db/client.ts`

- [ ] **Step 4.1: Read current `src/db/client.ts`**

Current contents (for reference):
```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const url = env().DATABASE_URL;

const queryClient = postgres(url, { max: 1, prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
```

- [ ] **Step 4.2: Append `Tx` and `DbOrTx` type exports**

Edit `src/db/client.ts` to add two type lines below the existing `export type DB`:

```ts
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type DbOrTx = DB | Tx;
```

Final file should be:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const url = env().DATABASE_URL;

const queryClient = postgres(url, { max: 1, prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type DbOrTx = DB | Tx;
```

- [ ] **Step 4.3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4.4: Commit**

```bash
git add src/db/client.ts
git commit -m "feat(db): export Tx + DbOrTx types for service injection"
```

---

## Task 5: Service repo functions (TDD against real Postgres)

Implements spec requirements: "Active goals list", "Create goal action" (server-side parts), "Archive goal action". Implements design D5, D7. Uses `withRollback` and `seedUser` from `tests/helpers/`.

**Files:**
- Create: `tests/integration/services/goals.test.ts`
- Create: `src/services/goals.ts`

- [ ] **Step 5.1: Write the failing integration tests**

Create `tests/integration/services/goals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals } from '@/db/schema';
import {
  listActiveGoals,
  getGoal,
  createGoal,
  archiveGoal,
} from '@/services/goals';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('listActiveGoals', () => {
  describe('Given a user with no goals', () => {
    describe('When listActiveGoals is called', () => {
      it('Then returns an empty array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const rows = await listActiveGoals(u.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user A has three active goals and user B has two', () => {
    describe('When listActiveGoals is called for user A', () => {
      it('Then returns only user A rows ordered by deadline_at ASC', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(goals).values([
            { userId: a.id, title: 'A-mid', deadlineAt: future(10) },
            { userId: a.id, title: 'A-late', deadlineAt: future(30) },
            { userId: a.id, title: 'A-soon', deadlineAt: future(2) },
            { userId: b.id, title: 'B-1', deadlineAt: future(5) },
            { userId: b.id, title: 'B-2', deadlineAt: future(6) },
          ]);
          const rows = await listActiveGoals(a.id, tx);
          expect(rows.map((r) => r.title)).toEqual(['A-soon', 'A-mid', 'A-late']);
        });
      });
    });
  });

  describe('Given a user with active, completed, and archived goals', () => {
    describe('When listActiveGoals is called', () => {
      it('Then excludes completed and archived', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await tx.insert(goals).values([
            { userId: u.id, title: 'active', deadlineAt: future(5), status: 'active' },
            { userId: u.id, title: 'done', deadlineAt: future(5), status: 'completed' },
            { userId: u.id, title: 'gone', deadlineAt: future(5), status: 'archived' },
          ]);
          const rows = await listActiveGoals(u.id, tx);
          expect(rows.map((r) => r.title)).toEqual(['active']);
        });
      });
    });
  });
});

describe('getGoal', () => {
  describe('Given a goal owned by user A', () => {
    describe('When getGoal is called by user A', () => {
      it('Then returns the row', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(7) })
            .returning();
          const row = await getGoal(g.id, a.id, tx);
          expect(row?.title).toBe('mine');
        });
      });
    });
  });

  describe('Given a goal owned by user A', () => {
    describe('When getGoal is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(7) })
            .returning();
          const row = await getGoal(g.id, b.id, tx);
          expect(row).toBeNull();
        });
      });
    });
  });
});

describe('createGoal', () => {
  describe('Given valid input', () => {
    describe('When createGoal is called', () => {
      it('Then inserts an active row and returns it', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createGoal(
            {
              title: 'Pass JLPT N3',
              description: 'focus listening',
              deadlineAt: future(30),
            },
            u.id,
            tx,
          );
          expect(created.userId).toBe(u.id);
          expect(created.status).toBe('active');
          expect(created.archivedAt).toBeNull();
          expect(created.title).toBe('Pass JLPT N3');
        });
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When createGoal is called', () => {
      it('Then throws (Zod validation) and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createGoal({ title: '', deadlineAt: future(7) }, u.id, tx),
          ).rejects.toThrow();
          const rows = await tx.select().from(goals).where(eq(goals.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given a deadline already in the past', () => {
    describe('When createGoal is called', () => {
      it('Then throws', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createGoal({ title: 'late', deadlineAt: future(-1) }, u.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });
});

describe('archiveGoal', () => {
  describe('Given an active goal owned by user A', () => {
    describe('When archiveGoal is called by user A', () => {
      it('Then status becomes archived and archived_at is set', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'x', deadlineAt: future(5) })
            .returning();
          await archiveGoal(g.id, a.id, tx);
          const [after] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(after.status).toBe('archived');
          expect(after.archivedAt).not.toBeNull();
        });
      });
    });
  });

  describe('Given an already-archived goal', () => {
    describe('When archiveGoal is called again', () => {
      it('Then is a no-op (no error)', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({
              userId: a.id,
              title: 'x',
              deadlineAt: future(5),
              status: 'archived',
              archivedAt: new Date(),
            })
            .returning();
          await expect(archiveGoal(g.id, a.id, tx)).resolves.toBeUndefined();
          const [after] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(after.status).toBe('archived');
        });
      });
    });
  });

  describe('Given a goal owned by user A', () => {
    describe('When archiveGoal is called by user B', () => {
      it('Then user A goal is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(5) })
            .returning();
          await archiveGoal(g.id, b.id, tx);
          const [after] = await tx
            .select()
            .from(goals)
            .where(and(eq(goals.id, g.id), eq(goals.userId, a.id)));
          expect(after.status).toBe('active');
          expect(after.archivedAt).toBeNull();
        });
      });
    });
  });
});
```

- [ ] **Step 5.2: Run — confirm RED**

Make sure Postgres is up: `docker compose ps` (start with `docker compose up -d db` if not).
Run: `pnpm test:integration -- goals`
Expected: FAIL — `Cannot find module '@/services/goals'`.

- [ ] **Step 5.3: Commit failing tests**

```bash
git add tests/integration/services/goals.test.ts
git commit -m "test(services): add failing goals service tests"
```

- [ ] **Step 5.4: Implement `src/services/goals.ts`**

```ts
import { and, asc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, type Goal } from '@/db/schema';
import { CreateGoalSchema, type CreateGoalInput } from '@/lib/zod/goals';

export async function listActiveGoals(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, 'active')))
    .orderBy(asc(goals.deadlineAt));
}

export async function getGoal(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createGoal(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal> {
  const parsed: CreateGoalInput = CreateGoalSchema.parse(input);
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      title: parsed.title,
      description: parsed.description ?? null,
      deadlineAt: parsed.deadlineAt,
    })
    .returning();
  return row;
}

export async function archiveGoal(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // Scope by both id AND userId so cross-user archives no-op silently.
  await db
    .update(goals)
    .set({ status: 'archived', archivedAt: sql`now()` })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.userId, userId),
        eq(goals.status, 'active'),
      ),
    );
}
```

- [ ] **Step 5.5: Run — confirm GREEN**

Run: `pnpm test:integration -- goals`
Expected: PASS — 10/10.

If a test about "already-archived no-op" fails because the WHERE clause filters out non-active rows (so the UPDATE simply matches zero rows and that's fine), the test should still pass — it's verifying that the row is unchanged.

- [ ] **Step 5.6: Commit implementation**

```bash
git add src/services/goals.ts
git commit -m "feat(services): add goals queries + create/archive (user-scoped)"
```

---

## Task 6: Server-action wrappers (`'use server'`)

Implements design D5. These wrap the repo functions with `auth()` (defense-in-depth, per D7) and `revalidatePath('/goals')`.

**Files:**
- Create: `src/services/goals.actions.ts`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `09-revalidating.md` before writing this file. Confirm the `'use server'` directive lives at the top of the file (module-level).

- [ ] **Step 6.1: Implement `src/services/goals.actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import * as svc from './goals';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }
  return session.user.id;
}

export type CreateGoalActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createGoalAction(
  _prev: CreateGoalActionState,
  formData: FormData,
): Promise<CreateGoalActionState> {
  const userId = await requireUserId();

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    description:
      String(formData.get('description') ?? '').trim() || undefined,
    // Convert <input type="datetime-local"> value (e.g. "2026-06-01T23:59")
    // into an ISO string with the Asia/Taipei offset baked in.
    // Browsers send wall-clock without timezone; we treat it as Taipei.
    deadlineAt: localDateTimeToTaipeiIso(
      String(formData.get('deadlineAt') ?? ''),
    ),
  };

  try {
    const created = await svc.createGoal(raw, userId);
    revalidatePath('/goals');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create goal',
    };
  }
}

export async function archiveGoalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.archiveGoal(id, userId);
  revalidatePath('/goals');
}

/**
 * The HTML datetime-local control sends a string like "2026-06-01T23:59"
 * with no timezone. The MVP treats that wall clock as Asia/Taipei (UTC+8).
 * Returns a full ISO string accepted by Zod's z.string().datetime({ offset: true }).
 */
function localDateTimeToTaipeiIso(value: string): string {
  if (!value) return '';
  // Taipei has no DST; offset is always +08:00.
  return `${value}:00+08:00`;
}
```

- [ ] **Step 6.2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 6.3: Commit**

```bash
git add src/services/goals.actions.ts
git commit -m "feat(services): add goals server actions (auth + revalidate)"
```

---

## Task 7: RSC page + `<GoalCard>` + `<CountdownBadge>`

Implements spec requirements: "Active goals list", "Countdown badge representation" (static-badge variants), "Authentication required". Implements design D1 (live ticker only when ≤1d), D10 (page architecture).

**Files:**
- Replace: `app/(app)/goals/page.tsx`
- Create: `src/components/goals/CountdownBadge.tsx`
- Create: `src/components/goals/GoalCard.tsx`

- [ ] **Step 7.1: Create `src/components/goals/CountdownBadge.tsx` (RSC, static)**

```tsx
import { Badge } from '@/components/ui/badge';

type Props = {
  daysRemaining: number;
};

export function CountdownBadge({ daysRemaining }: Props) {
  if (daysRemaining < 0) {
    return (
      <Badge variant="destructive" aria-label={`Overdue ${-daysRemaining} days`}>
        Overdue {-daysRemaining}d
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" aria-label={`${daysRemaining} days remaining`}>
      {daysRemaining}d
    </Badge>
  );
}
```

- [ ] **Step 7.2: Create `src/components/goals/GoalCard.tsx` (RSC)**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { daysUntil } from '@/domain/countdown';
import type { Goal } from '@/db/schema';
import { CountdownBadge } from './CountdownBadge';
import { HoursCountdown } from './HoursCountdown';
import { ArchiveGoalButton } from './ArchiveGoalButton';

type Props = {
  goal: Goal;
  now: Date;
};

export function GoalCard({ goal, now }: Props) {
  const days = daysUntil(goal.deadlineAt, now);
  const useLiveTicker = days <= 1 && days >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{goal.title}</CardTitle>
          {goal.description ? (
            <CardDescription>{goal.description}</CardDescription>
          ) : null}
        </div>
        {useLiveTicker ? (
          <HoursCountdown deadlineAt={goal.deadlineAt.toISOString()} />
        ) : (
          <CountdownBadge daysRemaining={days} />
        )}
      </CardHeader>
      <CardContent className="flex justify-end">
        <ArchiveGoalButton id={goal.id} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7.3: Replace `app/(app)/goals/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listActiveGoals } from '@/services/goals';
import { GoalCard } from '@/components/goals/GoalCard';
import { CreateGoalDialog } from '@/components/goals/CreateGoalDialog';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const goals = await listActiveGoals(session.user.id);
  const now = new Date();

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Goals</h1>
        <CreateGoalDialog />
      </header>

      {goals.length === 0 ? (
        <p className="text-zinc-600">No active goals yet. Create your first one.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

This file imports `<HoursCountdown>`, `<ArchiveGoalButton>`, and `<CreateGoalDialog>` which are created in later tasks — typecheck will fail until Tasks 8, 9, 10 land. That's expected and acceptable since this whole feature is one PR. (If you prefer never to leave a broken intermediate step, run Tasks 7→10 as a single "page + components" batch and commit only at the end of Task 10.)

- [ ] **Step 7.4: Defer typecheck/commit until Task 10**

Do NOT run `pnpm typecheck` or commit yet. The page references components from Tasks 8–10 that don't exist yet. Continue with Task 8.

---

## Task 8: `<HoursCountdown>` (client) + RTL test

Implements spec requirement: "Countdown badge representation" (live `Xh Ym` ticker for daysUntil ≤ 1). Implements design D1 risk mitigation (re-read `Date.now()` per tick to avoid drift accumulation).

**Files:**
- Create: `src/components/goals/HoursCountdown.tsx`
- Create: `tests/unit/components/goals/HoursCountdown.test.tsx`

- [ ] **Step 8.1: Implement `src/components/goals/HoursCountdown.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { daysUntil, hoursMinutesUntil } from '@/domain/countdown';

type Props = {
  deadlineAt: string; // ISO 8601
};

const TICK_MS = 60_000;

export function HoursCountdown({ deadlineAt }: Props) {
  const deadline = new Date(deadlineAt);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const days = daysUntil(deadline, now);
  if (days < 0) {
    return (
      <Badge variant="destructive" aria-label={`Overdue ${-days} days`}>
        Overdue {-days}d
      </Badge>
    );
  }

  const { hours, minutes } = hoursMinutesUntil(deadline, now);
  return (
    <Badge variant="secondary" aria-label={`${hours} hours ${minutes} minutes remaining`}>
      {hours}h {minutes}m
    </Badge>
  );
}
```

- [ ] **Step 8.2: Write the failing RTL test `tests/unit/components/goals/HoursCountdown.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HoursCountdown } from '@/components/goals/HoursCountdown';

describe('HoursCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T04:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given a deadline 4h 23m in the future', () => {
    describe('When mounted', () => {
      it('Then renders "4h 23m"', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(screen.getByText('4h 23m')).toBeInTheDocument();
      });
    });

    describe('When 60 seconds elapse', () => {
      it('Then renders "4h 22m"', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        act(() => {
          vi.advanceTimersByTime(60_000);
        });
        expect(screen.getByText('4h 22m')).toBeInTheDocument();
      });
    });
  });

  describe('Given a deadline 2 days in the past', () => {
    describe('When mounted', () => {
      it('Then renders "Overdue 2d"', () => {
        const deadline = new Date('2026-05-03T04:00:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(screen.getByText('Overdue 2d')).toBeInTheDocument();
      });
    });
  });
});
```

> Note: this test file lives under `tests/unit/components/...` so it matches the existing `vitest.config.mts` `unit` project glob (`tests/unit/**/*.test.tsx`).

- [ ] **Step 8.3: Run — confirm GREEN (implementation came first because the RTL test depends on the rendered component)**

Run: `pnpm test:unit -- HoursCountdown`
Expected: PASS — 3/3.

If RTL throws because `@testing-library/react` lacks an act-ready `IS_REACT_ACT_ENVIRONMENT` flag, ensure the test runs in the `unit` project (happy-dom env). The unit setup file at `tests/setup/unit.ts` already loads `@testing-library/jest-dom/vitest`. If react-19/RTL needs `globalThis.IS_REACT_ACT_ENVIRONMENT = true`, add that one line to `tests/setup/unit.ts`:

```ts
import '@testing-library/jest-dom/vitest';

// React 19 + RTL requires this flag in non-Jest environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
```

(Only add if the test fails with an act warning. Otherwise leave the setup file alone.)

- [ ] **Step 8.4: Commit**

```bash
git add src/components/goals/HoursCountdown.tsx tests/unit/components/goals/HoursCountdown.test.tsx tests/setup/unit.ts
git commit -m "feat(goals): add HoursCountdown live ticker with RTL test"
```

---

## Task 9: `<ArchiveGoalButton>`

Implements spec requirement: "Archive goal action" (UI side). Wraps `archiveGoalAction` in a small form.

**Files:**
- Create: `src/components/goals/ArchiveGoalButton.tsx`

- [ ] **Step 9.1: Implement `src/components/goals/ArchiveGoalButton.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { archiveGoalAction } from '@/services/goals.actions';

type Props = { id: string };

export function ArchiveGoalButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await archiveGoalAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Archive
      </Button>
    </form>
  );
}
```

> The inline `'use server'` form action is fine in Next 16 RSC contexts; alternatively bind: `<form action={archiveGoalAction.bind(null, id)}>` — pick one and keep it. The bind form is simpler; the inline form is more explicit. The plan uses the inline form to make the auth boundary visible at every callsite.

- [ ] **Step 9.2: Defer typecheck/commit to Task 10's combined check**

(The page from Task 7.3 still references `<CreateGoalDialog>` which lands in Task 10.)

---

## Task 10: `<CreateGoalDialog>` + `<CreateGoalForm>`

Implements spec requirement: "Create goal action" (UI side). Uses React 19's `useActionState` so validation errors render inline.

**Files:**
- Create: `src/components/goals/CreateGoalForm.tsx`
- Create: `src/components/goals/CreateGoalDialog.tsx`

- [ ] **Step 10.1: Create `src/components/goals/CreateGoalForm.tsx` (client component)**

```tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createGoalAction,
  type CreateGoalActionState,
} from '@/services/goals.actions';

const initialState: CreateGoalActionState = { status: 'idle' };

function defaultDeadlineLocalString(): string {
  // Default: tomorrow 23:59 in Asia/Taipei wall-clock.
  // The HTML datetime-local control accepts "YYYY-MM-DDTHH:mm" with NO timezone.
  // We compute tomorrow's date in Taipei and append "T23:59".
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const tomorrowUtc = new Date(Date.now() + 86_400_000);
  return `${fmt.format(tomorrowUtc)}T23:59`;
}

type Props = { onSuccess?: () => void };

export function CreateGoalForm({ onSuccess }: Props) {
  const [state, formAction, pending] = useActionState(
    createGoalAction,
    initialState,
  );

  if (state.status === 'success' && onSuccess) {
    // Defer to next tick so the dialog can close after render.
    queueMicrotask(onSuccess);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} autoFocus />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" maxLength={2000} rows={3} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deadlineAt">Deadline (Asia/Taipei)</Label>
        <Input
          id="deadlineAt"
          name="deadlineAt"
          type="datetime-local"
          required
          defaultValue={defaultDeadlineLocalString()}
        />
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create goal'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 10.2: Create `src/components/goals/CreateGoalDialog.tsx` (client component)**

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
import { CreateGoalForm } from './CreateGoalForm';

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new goal</DialogTitle>
        </DialogHeader>
        <CreateGoalForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 10.3: Verify the whole feature typechecks together**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 10.4: Verify the whole feature lints**

Run: `pnpm lint`
Expected: clean (no new errors).

- [ ] **Step 10.5: Verify production build succeeds**

Run: `pnpm build`
Expected: `next build` reports `/goals` as a dynamic route, no compilation errors.

- [ ] **Step 10.6: Commit the page + all components**

```bash
git add app/\(app\)/goals/page.tsx src/components/goals/
git commit -m "feat(goals): add /goals page, GoalCard, create dialog, archive button"
```

---

## Task 11: Acceptance walk-through + final verification

Runs every check the foundation CI runs, plus a manual UI sanity walk.

- [ ] **Step 11.1: Make sure local Postgres is up**

Run: `docker compose ps`
Expected: `goal-tree-db` is `(healthy)` on `127.0.0.1:5433->5432`. If not: `docker compose up -d db`.

- [ ] **Step 11.2: Apply migrations (idempotent)**

Run: `pnpm db:migrate`
Expected: `Migrations applied.`

- [ ] **Step 11.3: Run the full check suite**

Run each separately so failures are clearly attributed:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Expected: every command exits 0. Unit suite shows the new `countdown` (8 cases), `goals` Zod (6 cases), and `HoursCountdown` (3 cases) tests passing alongside the foundation tests. Integration suite shows the new `goals` services tests (10 cases) passing alongside the foundation `smoke` test.

- [ ] **Step 11.4: Manual UI walk (requires real GitHub OAuth + valid `.env.local`)**

Run: `pnpm dev`. In a browser:

1. Visit `/` → redirected to `/signin`. Sign in with GitHub.
2. Visit `/goals` → empty state ("No active goals yet") + "New goal" button.
3. Click "New goal" → dialog opens. Submit with title `"Pass JLPT N3"`, blank description, deadline 30 days out (default). → Card appears with `30d` badge.
4. Click "New goal" again. Submit title `"Tomorrow exam"`, deadline tomorrow 12:00 Taipei. → Card appears with live `Xh Ym` ticker (verify it updates within ~60s).
5. Open psql to manually create an overdue row to verify the badge:

   ```bash
   docker exec -it goal-tree-db psql -U postgres -d goal_tree
   ```

   Then in psql (replace `YOUR_USER_ID` with the value from `select id from users limit 1;`):

   ```sql
   insert into goals (user_id, title, deadline_at)
   values ('YOUR_USER_ID', 'Overdue thing', now() - interval '2 days');
   ```

   Refresh `/goals` → shows red `Overdue 2d` badge.
6. Click "Archive" on each goal → goal disappears from the list. Verify in psql: `select status, archived_at from goals;` — each archived row has `status='archived'` and a non-null `archived_at`.
7. Sign out via the header button → redirected to `/signin`.
8. Visit `/goals` while signed out → redirected to `/signin` (proxy enforces).

- [ ] **Step 11.5: Update README only if a developer-facing command changed**

If anything in `README.md` is now wrong (e.g., a new test path, a new `pnpm` script that didn't exist before), update it. For this feature, no script changes are expected — README likely needs no update.

If updated:

```bash
git add README.md
git commit -m "docs: note goals feature in local dev walk"
```

- [ ] **Step 11.6: Final status**

Run: `git log --oneline dev..HEAD`
Confirm: each task above is reflected as expected commits, no surprise commits.

Run: `git status`
Expected: clean working tree.

- [ ] **Step 11.7: Open the PR**

Use the `gh-pr` skill (or directly):

```bash
git push -u origin issues/1
gh pr create \
  --base dev \
  --title "feat: Goals & countdown (closes #1)" \
  --body "$(cat <<'EOF'
## Summary

- Implements MVP feature 1: `/goals` page with deadline countdown, create dialog, archive action.
- Closes #1.

## Spec / Issue

- openspec change: `openspec/changes/goals-and-countdown/`
- gh issue: #1

## Test evidence

- [x] Failing tests added before implementation (TDD).
- [x] `pnpm test:unit` passes.
- [x] `pnpm test:integration` passes (real Postgres).
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm build` succeeds.
- [x] Manual UI walk completed locally (sign in, create x2, manual overdue, archive, sign out).

## Notes

- Live ticker bound to `daysUntil <= 1` only, per design D1.
- All queries scoped by `userId` at the repo layer (defense in depth, design D7).
- `datetime-local` input value is treated as Asia/Taipei wall-clock (no DST in Taipei) and converted to ISO with `+08:00` offset before validation.
- E2E intentionally not added in this PR — Playwright remains local-only per the foundation rules.
EOF
)"
```

- [ ] **Step 11.8: After merge, archive the openspec change**

Run `/openspec-archive-change` (or invoke the `openspec-archive-change` skill) for `goals-and-countdown` so `openspec/specs/goals/spec.md` becomes the canonical spec of record.

---

## Self-Review Notes (done before this file was saved)

**Spec coverage**

| Spec requirement | Task(s) |
|---|---|
| Active goals list (user scoping, ordering, status filter) | 5 (tests + impl), 7 (page rendering) |
| Countdown badge representation (`Nd` / `Xh Ym` / `Overdue Nd`) | 1 (math), 7 (`<CountdownBadge>` + branch in `<GoalCard>`), 8 (live ticker incl. overdue branch) |
| Asia/Taipei calendar-day math (`daysUntil`) | 1 |
| Hours/minutes ticker math (`hoursMinutesUntil`) | 1 |
| Create goal action (Zod, insert, scoped) | 2 (Zod), 5 (repo + tests), 6 (server action), 10 (form UI) |
| Archive goal action (idempotent, scoped, no cross-user) | 5 (repo + tests), 6 (server action), 9 (button UI) |
| Authentication required (page redirects, actions reject) | 6 (`requireUserId`), 7 (page guard), Task 11.4 step 8 (manual unauth check) |
| Tests follow TDD + BDD-style nesting | Every Task with tests uses `describe('Given …', () => describe('When …', () => it('Then …')))` and the red→green pattern is split into separate commits where the work warrants it (Tasks 1, 5) |

**Placeholder scan:** none — every code step shows complete code, no "TODO/TBD/similar to/etc.".

**Type/name consistency:** repo functions named `listActiveGoals`/`getGoal`/`createGoal`/`archiveGoal` everywhere; action wrappers named `createGoalAction`/`archiveGoalAction` everywhere; types `CreateGoalInput`/`CreateGoalActionState` consistent across Tasks 2, 6, 10; Drizzle injection type `DbOrTx` consistent across Tasks 4 and 5.

**Known intermediate breakage:** Tasks 7–10 form a coherent batch — Task 7's page imports components that don't exist until Tasks 8/9/10. Typecheck/lint/build are deferred to Step 10.3–10.5. The plan calls this out explicitly in Steps 7.4 and 9.2 so an executing agent doesn't try to commit an incoherent state mid-batch.
