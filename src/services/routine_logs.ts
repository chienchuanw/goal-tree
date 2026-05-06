import { and, asc, eq, gte } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { routines, routineLogs, type RoutineLog } from '@/db/schema';
import { isWithinBackfillWindow } from '@/domain/taipei';
import { shiftDate } from '@/domain/streak';

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
