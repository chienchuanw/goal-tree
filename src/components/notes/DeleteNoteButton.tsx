import { Button } from '@/components/ui/button';
import { deleteNoteAction } from '@/services/notes.actions';

type Props = { id: string };

export function DeleteNoteButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await deleteNoteAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Delete
      </Button>
    </form>
  );
}
