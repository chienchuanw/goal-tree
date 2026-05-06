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
      <button
        type="submit"
        className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-signal"
      >
        Archive →
      </button>
    </form>
  );
}
