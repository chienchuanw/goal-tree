'use client';

import { useState, useTransition } from 'react';

export type CycleStatus = 'done' | 'partial' | 'skipped' | null;

const NEXT: Record<string, CycleStatus> = {
  null: 'done',
  done: 'partial',
  partial: 'skipped',
  skipped: null,
};

const LABEL: Record<string, string> = {
  null: 'Mark done',
  done: 'Done',
  partial: 'Partial',
  skipped: 'Skipped',
};

const COLOR: Record<string, string> = {
  null: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  done: 'bg-emerald-500 text-white hover:bg-emerald-600',
  partial: 'bg-amber-400 text-zinc-900 hover:bg-amber-500',
  skipped: 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400',
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

  function onClick() {
    const next = NEXT[String(optimistic)];
    const prev = optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await setStatusAction(routineId, date, next);
      if (result.status === 'error') setOptimistic(prev); // rollback
    });
  }

  const key = String(optimistic);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Status: ${LABEL[key]}. Click to cycle.`}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${COLOR[key]} disabled:opacity-60`}
    >
      {LABEL[key]}
    </button>
  );
}
