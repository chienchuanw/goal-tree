import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { todayInTaipei } from '@/domain/taipei';
import { listTodayRoutines } from '@/services/today';
import { listActiveGoals } from '@/services/goals';
import { RoutinesGroupedByGoal } from '@/components/routines/RoutinesGroupedByGoal';
import { CreateRoutineDialog } from '@/components/routines/CreateRoutineDialog';

export const dynamic = 'force-dynamic';

const HEADER_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Taipei',
});

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const today = todayInTaipei();
  const [rows, goals] = await Promise.all([
    listTodayRoutines(session.user.id, today),
    listActiveGoals(session.user.id),
  ]);

  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));
  const dateLabel = HEADER_FMT.format(new Date()).toUpperCase();
  const totalDone = rows.filter((r) => r.todayLog?.status === 'done').length;

  return (
    <section className="space-y-10 md:space-y-14">
      <header className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">01 · Today</p>
          <p className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {dateLabel}
          </p>
        </div>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <h1 className="display text-5xl md:text-7xl">
            What you<br className="hidden md:block" /> show up for.
          </h1>
          <CreateRoutineDialog goalOptions={goalOptions} />
        </div>

        {rows.length > 0 ? (
          <div className="flex items-baseline gap-4 pt-1">
            <span className="num text-2xl md:text-3xl text-ink">
              {String(totalDone).padStart(2, '0')}
              <span className="text-ink-faint">/{String(rows.length).padStart(2, '0')}</span>
            </span>
            <span className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              completed today
            </span>
          </div>
        ) : null}
        <div className="rule" />
      </header>

      {rows.length === 0 ? (
        <div className="border border-rule p-8 md:p-12">
          <p className="eyebrow mb-3">Empty</p>
          <p className="text-ink-soft text-base md:text-lg max-w-md leading-relaxed">
            No routines apply today. Build one — small, repeatable, surviveable.
          </p>
        </div>
      ) : (
        <RoutinesGroupedByGoal rows={rows} today={today} />
      )}
    </section>
  );
}
