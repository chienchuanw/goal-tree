import { and, asc, eq, gte, isNull } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, routines, routineLogs, type Routine, type RoutineLog } from '@/db/schema';
import { appliesOn, type RoutineCadence } from '@/domain/cadence';
import {
  build30DayHeatmap,
  shiftDate,
  streakLength,
  type HeatmapCellStatus,
  type StreakLog,
} from '@/domain/streak';

export type BarChartCell = { date: string; value: number | null };

export type TodayRoutineRow = {
  routine: Routine;
  goalTitle: string | null;
  todayLog: RoutineLog | null;
  heatmap: Array<{ date: string; status: HeatmapCellStatus }>;
  streak: number;
  barChart?: BarChartCell[];
};

function build30DayBarChart(logs: RoutineLog[], today: string): BarChartCell[] {
  const byDate = new Map(logs.map((l) => [l.logDate, l.value ?? null]));
  const cells: BarChartCell[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = shiftDate(today, -i);
    cells.push({ date, value: byDate.get(date) ?? null });
  }
  return cells;
}

export async function listTodayRoutines(
  userId: string,
  today: string,
  db: DbOrTx = defaultDb,
): Promise<TodayRoutineRow[]> {
  const since = shiftDate(today, -29);

  const [routineRows, allLogs] = await Promise.all([
    db
      .select({
        routine: routines,
        goalTitle: goals.title,
      })
      .from(routines)
      .leftJoin(goals, eq(goals.id, routines.goalId))
      .where(and(eq(routines.userId, userId), isNull(routines.archivedAt)))
      .orderBy(asc(routines.createdAt)),
    db
      .select()
      .from(routineLogs)
      .innerJoin(
        routines,
        and(eq(routines.id, routineLogs.routineId), eq(routines.userId, userId)),
      )
      .where(gte(routineLogs.logDate, since))
      .orderBy(asc(routineLogs.logDate)),
  ]);

  const logsByRoutine = new Map<string, RoutineLog[]>();
  for (const { routine_logs: log } of allLogs) {
    const arr = logsByRoutine.get(log.routineId) ?? [];
    arr.push(log);
    logsByRoutine.set(log.routineId, arr);
  }

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

    const baseRow: TodayRoutineRow = {
      routine,
      goalTitle: goalTitle ?? null,
      todayLog,
      heatmap: build30DayHeatmap(streakLogs, today, applies),
      streak: streakLength(streakLogs, today, applies),
    };
    if (routine.kind === 'quantity') {
      baseRow.barChart = build30DayBarChart(logs, today);
    }
    result.push(baseRow);
  }
  return result;
}
