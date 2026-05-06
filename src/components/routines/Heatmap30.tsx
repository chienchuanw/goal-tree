import type { HeatmapCellStatus } from '@/domain/streak';

const COLOR: Record<HeatmapCellStatus, string> = {
  done: 'bg-emerald-500',
  partial: 'bg-amber-400',
  skipped: 'bg-zinc-300',
  none: 'bg-zinc-100',
  na: 'bg-transparent',
};

type Props = {
  cells: Array<{ date: string; status: HeatmapCellStatus }>;
};

export function Heatmap30({ cells }: Props) {
  return (
    <div
      className="flex gap-[2px]"
      role="img"
      aria-label="30-day status heatmap, oldest on the left"
    >
      {cells.map((c) => (
        <span
          key={c.date}
          className={`h-3 w-3 rounded-sm ${COLOR[c.status]}`}
          title={`${c.date} — ${c.status}`}
        />
      ))}
    </div>
  );
}
