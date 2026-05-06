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
