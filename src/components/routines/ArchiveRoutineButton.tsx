import { Button } from '@/components/ui/button';
import { archiveRoutineAction } from '@/services/routines.actions';

type Props = { id: string };

export function ArchiveRoutineButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await archiveRoutineAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Archive
      </Button>
    </form>
  );
}
