'use client';

import { useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { setNoteGoalAction } from '@/services/notes.actions';

type Props = {
  noteId: string;
  currentGoalId: string | null;
  goalOptions: Array<{ id: string; title: string }>;
};

export function SetNoteGoalControl({ noteId, currentGoalId, goalOptions }: Props) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : e.target.value;
    startTransition(async () => {
      await setNoteGoalAction(noteId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="goalId" className="text-xs text-zinc-500">Linked goal</Label>
      <select
        id="goalId"
        defaultValue={currentGoalId ?? ''}
        onChange={onChange}
        disabled={pending}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        <option value="">— None —</option>
        {goalOptions.map((g) => (
          <option key={g.id} value={g.id}>{g.title}</option>
        ))}
      </select>
    </div>
  );
}
