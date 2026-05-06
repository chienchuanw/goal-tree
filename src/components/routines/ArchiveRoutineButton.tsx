import { archiveRoutineAction } from '@/services/routines.actions';
import { ConfirmActionButton } from '@/components/ui/ConfirmActionButton';

type Props = { id: string };

export function ArchiveRoutineButton({ id }: Props) {
  const action = async () => {
    'use server';
    await archiveRoutineAction(id);
  };
  return (
    <ConfirmActionButton
      action={action}
      triggerLabel="Archive"
      triggerAriaLabel="Archive routine"
      title="Archive this routine?"
      description="You can restore it anytime from /archive."
      confirmLabel="Archive"
      variant="destructive"
    />
  );
}
