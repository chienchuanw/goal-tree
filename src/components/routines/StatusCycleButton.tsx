'use client';

import { useState, useTransition } from 'react';

export type CycleStatus = 'done' | 'partial' | 'skipped' | null;

type Cell = 'unset' | 'done' | 'partial' | 'skipped';

const cellOf = (s: CycleStatus): Cell => s ?? 'unset';

const CONFIG: Record<Cell, { next: CycleStatus; label: string; color: string }> = {
  unset:   { next: 'done',    label: 'Mark done', color: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' },
  done:    { next: 'partial', label: 'Done',      color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  partial: { next: 'skipped', label: 'Partial',   color: 'bg-amber-400 text-zinc-900 hover:bg-amber-500' },
  skipped: { next: null,      label: 'Skipped',   color: 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400' },
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

export function StatusCycleButton({ routineId, date, initialStatus, setStatusAction }: Props) {
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
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${cfg.color} disabled:opacity-60`}
    >
      {cfg.label}
    </button>
  );
}
