type Cell = { date: string; value: number | null };

type Props = {
  cells: Cell[];
  target?: number;
  unit: string;
};

export function BarChart30({ cells, target, unit }: Props) {
  const observedMax = cells.reduce((m, c) => Math.max(m, c.value ?? 0), 0);
  const scale = Math.max(target ?? 0, observedMax, 1);
  const targetPct = target ? Math.min(100, (target / scale) * 100) : null;

  return (
    <div
      role="img"
      aria-label={`30-day ${unit} bar chart, oldest on the left`}
      className="relative flex h-8 items-end gap-px"
    >
      {cells.map((c, i) => {
        const v = c.value ?? 0;
        const heightPct = (v / scale) * 100;
        const tier =
          v <= 0
            ? 'bg-paper-tint'
            : target == null || v >= target
              ? 'bg-emerald-500'
              : 'bg-emerald-300';
        return (
          <span
            key={c.date}
            data-testid={`bar-cell-${i}`}
            className="flex h-full w-2 items-end"
            title={`${c.date} — ${c.value ?? 0} ${unit}`}
          >
            <span
              data-testid="bar"
              className={`block w-full ${tier}`}
              style={{ height: `${heightPct}%` }}
            />
          </span>
        );
      })}
      {targetPct !== null ? (
        <span
          data-testid="goal-line"
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 border-t border-emerald-600/40"
          style={{ bottom: `${targetPct}%` }}
        />
      ) : null}
    </div>
  );
}
