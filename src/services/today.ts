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
