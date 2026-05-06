'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createNoteAction,
  type CreateNoteActionState,
} from '@/services/notes.actions';

const initialState: CreateNoteActionState = { status: 'idle' };

type Props = {
  parentId: string | null;
  goalOptions?: Array<{ id: string; title: string }>;
  onSuccessAction?: () => void;
};

export function CreateNoteForm({ parentId, goalOptions = [], onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(createNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
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
            <option value="">— None —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create note'}
        </Button>
      </div>
    </form>
  );
}
