'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createRoutineAction,
  type CreateRoutineActionState,
} from '@/services/routines.actions';

const initialState: CreateRoutineActionState = { status: 'idle' };

const WEEKDAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

type Props = {
  goalOptions?: Array<{ id: string; title: string }>;
  onSuccessAction?: () => void;
};

export function CreateRoutineForm({ goalOptions = [], onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(createRoutineAction, initialState);
  const [cadence, setCadence] = useState<'daily' | 'weekdays'>('daily');
  const [kind, setKind] = useState<'check' | 'quantity'>('check');

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} autoFocus />
      </div>

      {goalOptions.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="goalId">Goal (optional)</Label>
          <select
            id="goalId"
            name="goalId"
            defaultValue=""
            className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">— None (General) —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      ) : null}

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Kind</legend>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="kind"
            value="check"
            checked={kind === 'check'}
            onChange={() => setKind('check')}
          />
          Check (done / partial / skipped)
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="kind"
            value="quantity"
            checked={kind === 'quantity'}
            onChange={() => setKind('quantity')}
          />
          Quantity (log a number)
        </label>
      </fieldset>

      {kind === 'quantity' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" name="unit" required maxLength={20} placeholder="min" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dailyTarget">Daily target (optional)</Label>
            <Input id="dailyTarget" name="dailyTarget" type="number" min={1} placeholder="30" />
          </div>
        </div>
      ) : null}

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Cadence</legend>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="cadenceType"
            value="daily"
            checked={cadence === 'daily'}
            onChange={() => setCadence('daily')}
          />
          Daily
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input
            type="radio"
            name="cadenceType"
            value="weekdays"
            checked={cadence === 'weekdays'}
            onChange={() => setCadence('weekdays')}
          />
          Specific weekdays
        </label>
      </fieldset>

      {cadence === 'weekdays' ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Weekdays</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map(({ value, label }) => (
              <label key={value} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekdays" value={value} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create routine'}
        </Button>
      </div>
    </form>
  );
}
