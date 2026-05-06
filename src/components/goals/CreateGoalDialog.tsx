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
import { CreateGoalForm } from './CreateGoalForm';

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New goal</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new goal</DialogTitle>
        </DialogHeader>
        <CreateGoalForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
