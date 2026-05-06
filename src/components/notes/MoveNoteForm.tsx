'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  moveNoteAction,
  type MoveNoteActionState,
} from '@/services/notes.actions';

const initialState: MoveNoteActionState = { status: 'idle' };

type ParentOption = { id: string; title: string; depth: number; disabled: boolean };

type Props = {
  noteId: string;
  parentOptions: ParentOption[];
  currentParentId: string | null;
  onSuccessAction?: () => void;
};

export function MoveNoteForm({ noteId, parentOptions, currentParentId, onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(moveNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={noteId} />
      <div className="space-y-1">
        <Label htmlFor="newParentId">Move under</Label>
        <select
          id="newParentId"
          name="newParentId"
          defaultValue={currentParentId ?? ''}
          className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
        >
          <option value="">— Root —</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id} disabled={p.disabled}>
              {'  '.repeat(p.depth)}
              {p.title}
              {p.disabled ? ' (would exceed depth)' : ''}
            </option>
          ))}
        </select>
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Moving…' : 'Move'}
        </Button>
      </div>
    </form>
  );
}
