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
      <button
        type="submit"
        className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-signal"
        aria-label="Archive routine"
      >
        Archive
      </button>
    </form>
  );
}
