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
import { CreateRoutineForm } from './CreateRoutineForm';

type Props = {
  goalOptions?: Array<{ id: string; title: string }>;
};

export function CreateRoutineDialog({ goalOptions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New routine</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new routine</DialogTitle>
        </DialogHeader>
        <CreateRoutineForm
          goalOptions={goalOptions}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
