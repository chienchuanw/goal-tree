import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { routines, routineLogs, type RoutineLog } from '@/db/schema';
import { isWithinBackfillWindow } from '@/domain/taipei';
import { shiftDate } from '@/domain/streak';
import { deriveQuantityStatus } from '@/domain/quantity-routine';

type LogStatus = 'done' | 'partial' | 'skipped';

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
    // Ownership check inside the tx — silent no-op for cross-user calls (openspec D7).
    const [owner] = await tx
      .select({ id: routines.id, kind: routines.kind })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!owner) return;
    if (owner.kind !== 'check') {
      throw new Error('routine is not a check routine');
    }

    if (status === null) {
      await tx
        .delete(routineLogs)
        .where(
          and(eq(routineLogs.routineId, routineId), eq(routineLogs.logDate, date)),
        );
      return;
    }

    await tx
      .insert(routineLogs)
      .values({ routineId, logDate: date, status })
      .onConflictDoUpdate({
        target: [routineLogs.routineId, routineLogs.logDate],
        set: { status },
      });
  });
}

export async function listLogsForLast30Days(
  routineId: string,
  userId: string,
  today: string,
  db: DbOrTx = defaultDb,
): Promise<RoutineLog[]> {
  const since = shiftDate(today, -29);

  return db
    .select({
      id: routineLogs.id,
      routineId: routineLogs.routineId,
      logDate: routineLogs.logDate,
      status: routineLogs.status,
      value: routineLogs.value,
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

export async function incrementRoutineLog(
  routineId: string,
  userId: string,
  date: string,
  delta: number,
  db: DbOrTx = defaultDb,
): Promise<void> {
  if (delta <= 0) throw new Error('delta must be positive');
  if (!isWithinBackfillWindow(date)) {
    throw new Error('date is outside the 2-day backfill window');
  }

  await db.transaction(async (tx) => {
    const [routine] = await tx
      .select({
        id: routines.id,
        kind: routines.kind,
        dailyTarget: routines.dailyTarget,
      })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!routine) return;
    if (routine.kind !== 'quantity') {
      throw new Error('routine is not a quantity routine');
    }

    // Compute addition in SQL so two concurrent increments can't lose a write.
    // For status, treat null target as threshold=1 — any positive value is 'done'.
    const threshold = routine.dailyTarget ?? 1;
    const initialStatus: 'done' | 'partial' =
      routine.dailyTarget == null || delta >= routine.dailyTarget ? 'done' : 'partial';

    await tx
      .insert(routineLogs)
      .values({ routineId, logDate: date, status: initialStatus, value: delta })
      .onConflictDoUpdate({
        target: [routineLogs.routineId, routineLogs.logDate],
        set: {
          value: sql`${routineLogs.value} + ${delta}`,
          status: sql`CASE WHEN ${routineLogs.value} + ${delta} >= ${threshold} THEN 'done' ELSE 'partial' END`,
        },
      });
  });
}

export async function setRoutineLogValue(
  routineId: string,
  userId: string,
  date: string,
  value: number,
  db: DbOrTx = defaultDb,
): Promise<void> {
  if (value < 0) throw new Error('value must be >= 0');
  if (!isWithinBackfillWindow(date)) {
    throw new Error('date is outside the 2-day backfill window');
  }

  await db.transaction(async (tx) => {
    const [routine] = await tx
      .select({
        id: routines.id,
        kind: routines.kind,
        dailyTarget: routines.dailyTarget,
      })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!routine) return;
    if (routine.kind !== 'quantity') {
      throw new Error('routine is not a quantity routine');
    }

    const status = deriveQuantityStatus(value, routine.dailyTarget);
    if (status === null) {
      await tx
        .delete(routineLogs)
        .where(and(eq(routineLogs.routineId, routineId), eq(routineLogs.logDate, date)));
      return;
    }

    await tx
      .insert(routineLogs)
      .values({ routineId, logDate: date, status, value })
      .onConflictDoUpdate({
        target: [routineLogs.routineId, routineLogs.logDate],
        set: { value, status },
      });
  });
}
