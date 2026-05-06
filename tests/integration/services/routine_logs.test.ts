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
