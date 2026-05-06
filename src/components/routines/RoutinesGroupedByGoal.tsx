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

  const entries = [...groups.entries()];

  return (
    <div className="space-y-12 md:space-y-16">
      {entries.map(([title, group], i) => (
        <section key={title} className="space-y-4">
          <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
            <div className="flex items-baseline gap-3">
              <span className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                §{String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base md:text-lg font-medium tracking-tight text-ink">
                {title}
              </h2>
            </div>
            <span className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              {String(group.length).padStart(2, '0')} routine{group.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="divide-y divide-rule border-b border-rule">
            {group.map((row) => (
              <RoutineRow key={row.routine.id} row={row} today={today} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
