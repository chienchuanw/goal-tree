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
import { RenameNoteForm } from './RenameNoteForm';

type Props = { noteId: string; initialTitle: string };

export function RenameNoteDialog({ noteId, initialTitle }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>Rename</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename note</DialogTitle>
        </DialogHeader>
        <RenameNoteForm
          noteId={noteId}
          initialTitle={initialTitle}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
