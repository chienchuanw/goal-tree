import { and, asc, eq, gte } from 'drizzle-orm';
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
