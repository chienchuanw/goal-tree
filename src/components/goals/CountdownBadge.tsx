type Props = {
  daysRemaining: number;
};

export function CountdownBadge({ daysRemaining }: Props) {
  const overdue = daysRemaining < 0;
  const value = overdue ? -daysRemaining : daysRemaining;
  const label = overdue
    ? `Overdue ${value} days`
    : `${value} days remaining`;
  const tone = overdue ? 'text-signal' : 'text-ink';

  return (
    <span
      aria-label={label}
      className="inline-flex flex-col items-end leading-none"
    >
      <span className={`num text-3xl md:text-4xl font-medium ${tone}`}>
        {value}
        <span className="text-base text-ink-muted">d</span>
      </span>
      <span className="num mt-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {overdue ? 'Overdue' : 'Remaining'}
      </span>
    </span>
  );
}
