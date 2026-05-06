import { unarchiveRoutineAction } from '@/services/routines.actions';
import { ConfirmActionButton } from '@/components/ui/ConfirmActionButton';

type Props = { id: string };

export function RestoreRoutineButton({ id }: Props) {
  const action = async () => {
    'use server';
    await unarchiveRoutineAction(id);
  };
  return (
    <ConfirmActionButton
      action={action}
      triggerLabel="Restore"
      triggerAriaLabel="Restore routine"
      title="Restore this routine?"
      description="You can archive it again anytime."
      confirmLabel="Restore"
    />
  );
}
