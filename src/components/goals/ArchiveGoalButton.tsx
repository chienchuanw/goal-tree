import { archiveGoalAction } from '@/services/goals.actions';
import { ConfirmActionButton } from '@/components/ui/ConfirmActionButton';

type Props = { id: string };

export function ArchiveGoalButton({ id }: Props) {
  const action = async () => {
    'use server';
    await archiveGoalAction(id);
  };
  return (
    <ConfirmActionButton
      action={action}
      triggerLabel="Archive →"
      triggerAriaLabel="Archive goal"
      title="Archive this goal?"
      description="You can restore it anytime from /archive."
      confirmLabel="Archive"
      variant="destructive"
    />
  );
}
