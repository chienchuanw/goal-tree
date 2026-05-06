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
import { CreateNoteForm } from './CreateNoteForm';

type Props = {
  parentId: string | null;
  buttonLabel?: string;
  goalOptions?: Array<{ id: string; title: string }>;
};

export function CreateNoteDialog({ parentId, buttonLabel = 'New note', goalOptions }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{buttonLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parentId ? 'New child note' : 'New root note'}</DialogTitle>
        </DialogHeader>
        <CreateNoteForm
          parentId={parentId}
          goalOptions={goalOptions}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
