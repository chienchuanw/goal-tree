'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateGoalForm } from './CreateGoalForm';

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group inline-flex items-center gap-3 border border-ink bg-ink px-4 py-2.5 text-sm tracking-tight text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            <span aria-hidden className="num text-[10px] tracking-[0.2em]">+</span>
            New goal
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="display text-2xl">New goal.</DialogTitle>
          <p className="eyebrow">A sentence + a deadline.</p>
        </DialogHeader>
        <CreateGoalForm onSuccessAction={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
