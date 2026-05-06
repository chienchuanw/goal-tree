import { daysUntil } from '@/domain/countdown';
import { formatTaipeiDateLabel } from '@/domain/taipei';
import type { Goal } from '@/db/schema';
import { CountdownBadge } from './CountdownBadge';
import { HoursCountdown } from './HoursCountdown';
import { ArchiveGoalButton } from './ArchiveGoalButton';

type Props = {
  goal: Goal;
  now: Date;
  index?: number;
};

export function GoalCard({ goal, now, index }: Props) {
  const days = daysUntil(goal.deadlineAt, now);
  const useLiveTicker = days <= 1 && days >= 0;
  const deadlineLabel = formatTaipeiDateLabel(goal.deadlineAt);

  return (
    <article className="group relative flex h-full min-h-[200px] flex-col justify-between gap-6 bg-paper p-5 md:p-6 transition-colors hover:bg-paper-soft">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
            {typeof index === 'number' ? String(index).padStart(2, '0') : '—'}
            <span aria-hidden className="mx-1.5 text-ink-faint/60">/</span>
            {deadlineLabel}
          </p>
          <h3 className="text-lg md:text-xl font-medium leading-tight tracking-tight text-ink">
            {goal.title}
          </h3>
          {goal.description ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-muted line-clamp-3">
              {goal.description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          {useLiveTicker ? (
            <HoursCountdown deadlineAt={goal.deadlineAt.toISOString()} />
          ) : (
            <CountdownBadge daysRemaining={days} />
          )}
        </div>
      </header>

      <footer className="flex items-center justify-between border-t border-rule pt-3">
        <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Active
        </span>
        <ArchiveGoalButton id={goal.id} />
      </footer>
    </article>
  );
}
