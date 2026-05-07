import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback, type TestDb } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';

type Tx = Parameters<Parameters<TestDb['transaction']>[0]>[0];
import { routines, routineLogs } from '@/db/schema';
import {
  setRoutineStatus,
  listLogsForLast30Days,
  incrementRoutineLog,
  setRoutineLogValue,
} from '@/services/routine_logs';
import { todayInTaipei } from '@/domain/taipei';

async function seedQuantityRoutine(tx: Tx, userId: string, target: number | null = 30) {
  const [r] = await tx
    .insert(routines)
    .values({
      userId,
      title: 'Exercise',
      cadenceType: 'daily',
      kind: 'quantity',
      unit: 'min',
      dailyTarget: target,
    })
    .returning();
  return r;
}

async function seedRoutine(tx: Tx, userId: string) {
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

describe('incrementRoutineLog', () => {
  it('inserts a row with delta as value and partial status when below target', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await incrementRoutineLog(r.id, u.id, today, 15, tx);
      const [row] = await tx
        .select()
        .from(routineLogs)
        .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, today)));
      expect(row.value).toBe(15);
      expect(row.status).toBe('partial');
    });
  });

  it('flips status to done when cumulative value crosses target', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await tx
        .insert(routineLogs)
        .values({ routineId: r.id, logDate: today, status: 'partial', value: 15 });
      await incrementRoutineLog(r.id, u.id, today, 20, tx);
      const [row] = await tx
        .select()
        .from(routineLogs)
        .where(and(eq(routineLogs.routineId, r.id), eq(routineLogs.logDate, today)));
      expect(row.value).toBe(35);
      expect(row.status).toBe('done');
    });
  });

  it('rejects when routine kind is check', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedRoutine(tx, u.id);
      const today = todayInTaipei();
      await expect(
        incrementRoutineLog(r.id, u.id, today, 5, tx),
      ).rejects.toThrow(/quantity/i);
    });
  });

  it('rejects non-positive delta', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await expect(incrementRoutineLog(r.id, u.id, today, 0, tx)).rejects.toThrow();
      await expect(incrementRoutineLog(r.id, u.id, today, -1, tx)).rejects.toThrow();
    });
  });

  it('is a silent no-op for cross-user calls', async () => {
    await withRollback(async (tx) => {
      const owner = await seedUser(tx);
      const intruder = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, owner.id, 30);
      const today = todayInTaipei();
      await incrementRoutineLog(r.id, intruder.id, today, 10, tx);
      const rows = await tx
        .select()
        .from(routineLogs)
        .where(eq(routineLogs.routineId, r.id));
      expect(rows).toHaveLength(0);
    });
  });
});

describe('setRoutineLogValue', () => {
  it('upserts a row with the absolute value and derived status', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await setRoutineLogValue(r.id, u.id, today, 45, tx);
      const [row] = await tx
        .select()
        .from(routineLogs)
        .where(eq(routineLogs.routineId, r.id));
      expect(row.value).toBe(45);
      expect(row.status).toBe('done');
    });
  });

  it('deletes the row when value=0', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await tx
        .insert(routineLogs)
        .values({ routineId: r.id, logDate: today, status: 'partial', value: 10 });
      await setRoutineLogValue(r.id, u.id, today, 0, tx);
      const rows = await tx
        .select()
        .from(routineLogs)
        .where(eq(routineLogs.routineId, r.id));
      expect(rows).toHaveLength(0);
    });
  });
});

describe('setRoutineStatus rejects quantity routines', () => {
  it('throws when called on a quantity routine', async () => {
    await withRollback(async (tx) => {
      const u = await seedUser(tx);
      const r = await seedQuantityRoutine(tx, u.id, 30);
      const today = todayInTaipei();
      await expect(
        setRoutineStatus(r.id, u.id, today, 'done', tx),
      ).rejects.toThrow(/check/i);
    });
  });
});
