import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { formatTaipeiDateLabel } from '@/domain/taipei';
import { listArchivedRoutines } from '@/services/routines';
import { listArchivedGoals } from '@/services/goals';
import { RestoreRoutineButton } from '@/components/routines/RestoreRoutineButton';
import { RestoreGoalButton } from '@/components/goals/RestoreGoalButton';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const [routines, goals] = await Promise.all([
    listArchivedRoutines(session.user.id),
    listArchivedGoals(session.user.id),
  ]);

  return (
    <section className="space-y-12 md:space-y-16">
      <header className="space-y-4">
        <p className="eyebrow">04 · Archive</p>
        <h1 className="display text-5xl md:text-7xl">
          Filed away.<br className="hidden md:block" /> Not lost.
        </h1>
        <div className="rule" />
      </header>

      <section aria-labelledby="archived-routines" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="archived-routines" className="display text-2xl md:text-3xl">
            Archived routines
          </h2>
          <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {String(routines.length).padStart(2, '0')}
          </span>
        </div>
        {routines.length === 0 ? (
          <p className="text-sm text-ink-faint">No archived routines.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {routines.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] md:text-base font-medium tracking-tight text-ink">
                    {r.title}
                  </h3>
                  <p className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    {r.cadenceType} · archived {formatTaipeiDateLabel(r.archivedAt)}
                  </p>
                </div>
                <RestoreRoutineButton id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="archived-goals" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="archived-goals" className="display text-2xl md:text-3xl">
            Archived goals
          </h2>
          <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {String(goals.length).padStart(2, '0')}
          </span>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-ink-faint">No archived goals.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {goals.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] md:text-base font-medium tracking-tight text-ink">
                    {g.title}
                  </h3>
                  <p className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    archived {formatTaipeiDateLabel(g.archivedAt)}
                  </p>
                </div>
                <RestoreGoalButton id={g.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
