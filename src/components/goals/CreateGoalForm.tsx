'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createGoalAction,
  type CreateGoalActionState,
} from '@/services/goals.actions';

const initialState: CreateGoalActionState = { status: 'idle' };

function defaultDeadlineLocalString(): string {
  // Default: tomorrow 23:59 wall-clock in Asia/Taipei.
  // <input type="datetime-local"> accepts "YYYY-MM-DDTHH:mm" with no timezone.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const tomorrowUtc = new Date(Date.now() + 86_400_000);
  return `${fmt.format(tomorrowUtc)}T23:59`;
}

type Props = { onSuccessAction?: () => void };

export function CreateGoalForm({ onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(
    createGoalAction,
    initialState,
  );

  if (state.status === 'success' && onSuccessAction) {
    queueMicrotask(onSuccessAction);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} autoFocus />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" maxLength={2000} rows={3} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deadlineAt">Deadline (Asia/Taipei)</Label>
        <Input
          id="deadlineAt"
          name="deadlineAt"
          type="datetime-local"
          required
          defaultValue={defaultDeadlineLocalString()}
        />
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create goal'}
        </Button>
      </div>
    </form>
  );
}
