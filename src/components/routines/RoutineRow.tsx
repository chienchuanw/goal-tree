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
    <li className="flex items-center justify-between gap-4 rounded border border-zinc-200 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <StatusCycleButton
            routineId={row.routine.id}
            date={today}
            initialStatus={initialStatus}
            actionFn={setRoutineStatusAction}
          />
          <span className="truncate font-medium">{row.routine.title}</span>
          <span className="ml-auto text-xs text-zinc-500">streak: {row.streak}</span>
        </div>
        <div className="mt-2">
          <Heatmap30 cells={row.heatmap} />
        </div>
      </div>
      <ArchiveRoutineButton id={row.routine.id} />
    </li>
  );
}
