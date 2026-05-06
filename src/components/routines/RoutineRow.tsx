import type { TodayRoutineRow } from '@/services/today';
import { setRoutineStatusAction } from '@/services/routine_logs.actions';
import { StatusCycleButton, type CycleStatus } from './StatusCycleButton';
import { Heatmap30 } from './Heatmap30';
import { ArchiveRoutineButton } from './ArchiveRoutineButton';

type Props = {
  row: TodayRoutineRow;
  today: string;
};

export function RoutineRow({ row, today }: Props) {
  const initialStatus = (row.todayLog?.status ?? null) as CycleStatus;
  return (
    <li className="group py-4 md:py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          <StatusCycleButton
            routineId={row.routine.id}
            date={today}
            initialStatus={initialStatus}
            setStatusAction={setRoutineStatusAction}
          />
          <h3 className="truncate text-[15px] md:text-base font-medium tracking-tight text-ink">
            {row.routine.title}
          </h3>
        </div>

        <div className="flex items-center gap-5 md:gap-6 pl-12 md:pl-0">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-base md:text-lg font-medium text-ink">
              {row.streak}
            </span>
            <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              streak
            </span>
          </div>
          <div className="hidden sm:block">
            <Heatmap30 cells={row.heatmap} />
          </div>
          <ArchiveRoutineButton id={row.routine.id} />
        </div>
      </div>

      {/* Mobile: heatmap on its own row, full-width */}
      <div className="mt-3 pl-12 sm:hidden">
        <Heatmap30 cells={row.heatmap} />
      </div>
    </li>
  );
}
