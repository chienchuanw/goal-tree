import type { TodayRoutineRow } from '@/services/today';
import {
  setRoutineStatusAction,
  incrementRoutineLogAction,
} from '@/services/routine_logs.actions';
import { StatusCycleButton, type CycleStatus } from './StatusCycleButton';
import { Heatmap30 } from './Heatmap30';
import { BarChart30 } from './BarChart30';
import { QuantityLogInput } from './QuantityLogInput';
import { ArchiveRoutineButton } from './ArchiveRoutineButton';

type Props = {
  row: TodayRoutineRow;
  today: string;
};

export function RoutineRow({ row, today }: Props) {
  const isQuantity = row.routine.kind === 'quantity';
  const target = row.routine.dailyTarget ?? undefined;
  const unit = row.routine.unit ?? '';

  const chart =
    isQuantity && row.barChart ? (
      <BarChart30 cells={row.barChart} target={target} unit={unit} />
    ) : (
      <Heatmap30 cells={row.heatmap} />
    );

  const control = isQuantity ? (
    <QuantityLogInput
      routineId={row.routine.id}
      unit={unit}
      target={target}
      todayValue={row.todayLog?.value ?? 0}
      incrementAction={incrementRoutineLogAction}
    />
  ) : (
    <StatusCycleButton
      routineId={row.routine.id}
      date={today}
      initialStatus={(row.todayLog?.status ?? null) as CycleStatus}
      setStatusAction={setRoutineStatusAction}
    />
  );

  return (
    <li className="group py-4 md:py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          {control}
          <h3 className="truncate text-[15px] md:text-base font-medium tracking-tight text-ink">
            {row.routine.title}
          </h3>
        </div>

        <div className="flex items-center gap-5 md:gap-6 pl-12 md:pl-0">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-base md:text-lg font-medium text-ink">{row.streak}</span>
            <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">streak</span>
          </div>
          <div className="hidden sm:block">{chart}</div>
          <ArchiveRoutineButton id={row.routine.id} />
        </div>
      </div>

      <div className="mt-3 pl-12 sm:hidden">{chart}</div>
    </li>
  );
}
