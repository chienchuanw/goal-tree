'use client';

import { useState, useTransition } from 'react';

type IncrementAction = (
  routineId: string,
  delta: number,
) => Promise<{ status: 'ok' } | { status: 'error'; message: string }>;

type Props = {
  routineId: string;
  unit: string;
  target?: number;
  todayValue: number;
  incrementAction: IncrementAction;
};

export function QuantityLogInput({ routineId, unit, target, todayValue, incrementAction }: Props) {
  const [optimisticValue, setOptimisticValue] = useState(todayValue);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const prev = optimisticValue;
    setOptimisticValue(prev + parsed);
    setDraft('');
    setError(null);
    startTransition(async () => {
      const result = await incrementAction(routineId, parsed);
      if (result.status === 'error') {
        setOptimisticValue(prev);
        setError(result.message);
      }
    });
  }

  const totalLabel = target != null
    ? `${optimisticValue} / ${target} ${unit}`
    : `${optimisticValue} ${unit}`;

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <span className="num text-sm text-ink">{totalLabel}</span>
      <label className="sr-only" htmlFor={`qty-${routineId}`}>
        {`Add ${unit === 'min' ? 'minutes' : unit}`}
      </label>
      <input
        id={`qty-${routineId}`}
        type="number"
        inputMode="numeric"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="num h-8 w-16 border border-rule px-1 text-sm"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 border border-ink bg-paper px-2 text-xs font-medium text-ink hover:bg-paper-tint disabled:opacity-60"
      >
        Add
      </button>
      {error ? <span className="text-xs text-red-600" role="alert">{error}</span> : null}
    </form>
  );
}
