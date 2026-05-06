'use client';

import { useState, useTransition } from 'react';

export type CycleStatus = 'done' | 'partial' | 'skipped' | null;

type Cell = 'unset' | 'done' | 'partial' | 'skipped';

const cellOf = (s: CycleStatus): Cell => s ?? 'unset';

const CONFIG: Record<
  Cell,
  { next: CycleStatus; label: string; classes: string; glyph: string }
> = {
  unset: {
    next: 'done',
    label: 'Mark done',
    classes: 'bg-paper text-ink-faint border-ink-faint hover:border-ink hover:text-ink',
    glyph: '',
  },
  done: {
    next: 'partial',
    label: 'Done',
    classes: 'bg-ink text-paper border-ink hover:bg-ink-soft',
    glyph: '✓',
  },
  partial: {
    next: 'skipped',
    label: 'Partial',
    classes: 'bg-paper text-ink border-ink hover:bg-paper-tint',
    glyph: '/',
  },
  skipped: {
    next: null,
    label: 'Skipped',
    classes: 'bg-paper-tint text-ink-muted border-rule hover:border-ink-muted',
    glyph: '—',
  },
};

type SetStatusAction = (
  routineId: string,
  date: string,
  status: CycleStatus,
) => Promise<{ status: 'ok' } | { status: 'error'; message: string }>;

type Props = {
  routineId: string;
  date: string;
  initialStatus: CycleStatus;
  setStatusAction: SetStatusAction;
};

export function StatusCycleButton({
  routineId,
  date,
  initialStatus,
  setStatusAction,
}: Props) {
  const [optimistic, setOptimistic] = useState<CycleStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  const cfg = CONFIG[cellOf(optimistic)];

  function onClick() {
    const prev = optimistic;
    setOptimistic(cfg.next);
    startTransition(async () => {
      const result = await setStatusAction(routineId, date, cfg.next);
      if (result.status === 'error') setOptimistic(prev);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Status: ${cfg.label}. Click to cycle.`}
      title={cfg.label}
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center border text-base font-medium leading-none transition-colors disabled:opacity-60',
        cfg.classes,
      ].join(' ')}
    >
      <span className="num">{cfg.glyph || ' '}</span>
    </button>
  );
}
