import { unarchiveGoalAction } from '@/services/goals.actions';
import { ConfirmActionButton } from '@/components/ui/ConfirmActionButton';

type Props = { id: string };

export function RestoreGoalButton({ id }: Props) {
  const action = async () => {
    'use server';
    await unarchiveGoalAction(id);
  };
  return (
    <ConfirmActionButton
      action={action}
      triggerLabel="Restore"
      triggerAriaLabel="Restore goal"
      title="Restore this goal?"
      description="You can archive it again anytime."
      confirmLabel="Restore"
    />
  );
}
