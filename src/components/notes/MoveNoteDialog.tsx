'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoveNoteForm } from './MoveNoteForm';

type ParentOption = { id: string; title: string; depth: number; disabled: boolean };

type Props = {
  noteId: string;
  parentOptions: ParentOption[];
  currentParentId: string | null;
};

export function MoveNoteDialog({ noteId, parentOptions, currentParentId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>Move</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move note</DialogTitle>
        </DialogHeader>
        <MoveNoteForm
          noteId={noteId}
          parentOptions={parentOptions}
          currentParentId={currentParentId}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
