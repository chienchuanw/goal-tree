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
