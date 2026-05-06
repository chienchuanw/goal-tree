'use client';

import { useActionState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { todayInTaipei } from '@/domain/taipei';
import {
  createGoalAction,
  type CreateGoalActionState,
} from '@/services/goals.actions';

const initialState: CreateGoalActionState = { status: 'idle' };

function defaultDeadlineLocalString(): string {
  return `${todayInTaipei(new Date(Date.now() + 86_400_000))}T23:59`;
}

type Props = { onSuccessAction?: () => void };

export function CreateGoalForm({ onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(
    createGoalAction,
    initialState,
  );

  const defaultDeadline = useMemo(() => defaultDeadlineLocalString(), []);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

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
          defaultValue={defaultDeadline}
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
