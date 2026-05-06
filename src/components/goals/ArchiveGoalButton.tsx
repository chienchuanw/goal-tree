import { Button } from '@/components/ui/button';
import { archiveGoalAction } from '@/services/goals.actions';

type Props = { id: string };

export function ArchiveGoalButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await archiveGoalAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Archive
      </Button>
    </form>
  );
}
