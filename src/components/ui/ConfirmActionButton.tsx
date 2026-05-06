'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

type Variant = 'default' | 'destructive';

type Props = {
  action: () => Promise<void>;
  triggerLabel: string;
  triggerAriaLabel: string;
  triggerClassName?: string;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: Variant;
};

const DEFAULT_TRIGGER_CLASS =
  'num text-[10px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-signal';

export function ConfirmActionButton({
  action,
  triggerLabel,
  triggerAriaLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  variant = 'default',
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      await action();
      setOpen(false);
    });
  };

  const confirmClass =
    variant === 'destructive'
      ? 'inline-flex items-center px-4 py-2 text-sm tracking-tight border border-signal bg-signal text-paper hover:bg-paper hover:text-signal disabled:opacity-50'
      : 'inline-flex items-center px-4 py-2 text-sm tracking-tight border border-ink bg-ink text-paper hover:bg-paper hover:text-ink disabled:opacity-50';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={triggerAriaLabel}
            className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
          >
            {triggerLabel}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="display text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-3 pt-2">
          <DialogClose
            render={
              <button
                type="button"
                className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
              >
                Cancel
              </button>
            }
          />
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={confirmClass}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
