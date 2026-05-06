import type { HeatmapCellStatus } from '@/domain/streak';

const COLOR: Record<HeatmapCellStatus, string> = {
  done: 'bg-ink',
  partial: 'bg-ink-muted',
  skipped: 'bg-ink-faint/60',
  none: 'bg-paper-tint',
  na: 'bg-transparent border border-rule',
};

type Props = {
  cells: Array<{ date: string; status: HeatmapCellStatus }>;
};

export function Heatmap30({ cells }: Props) {
  return (
    <div
      className="flex gap-px"
      role="img"
      aria-label="30-day status heatmap, oldest on the left"
    >
      {cells.map((c) => (
        <span
          key={c.date}
          className={`h-3 w-2 sm:h-3.5 sm:w-2 ${COLOR[c.status]}`}
          title={`${c.date} — ${c.status}`}
        />
      ))}
    </div>
  );
}
