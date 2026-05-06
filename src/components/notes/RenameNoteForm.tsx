'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  renameNoteAction,
  type RenameNoteActionState,
} from '@/services/notes.actions';

const initialState: RenameNoteActionState = { status: 'idle' };

type Props = {
  noteId: string;
  initialTitle: string;
  onSuccessAction?: () => void;
};

export function RenameNoteForm({ noteId, initialTitle, onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(renameNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={noteId} />
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={initialTitle} autoFocus />
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Renaming…' : 'Rename'}
        </Button>
      </div>
    </form>
  );
}
