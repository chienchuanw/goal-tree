import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listActiveGoals } from '@/services/goals';
import { GoalCard } from '@/components/goals/GoalCard';
import { CreateGoalDialog } from '@/components/goals/CreateGoalDialog';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const goals = await listActiveGoals(session.user.id);
  const now = new Date();
  const count = goals.length;

  return (
    <section className="space-y-10 md:space-y-14">
      <header className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">02 · Goals</p>
          <p className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            {String(count).padStart(2, '0')} active
          </p>
        </div>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <h1 className="display text-5xl md:text-7xl">
            Things with<br className="hidden md:block" /> a deadline.
          </h1>
          <CreateGoalDialog />
        </div>
        <div className="rule" />
      </header>

      {count === 0 ? (
        <div className="border border-rule p-8 md:p-12">
          <p className="eyebrow mb-3">Empty</p>
          <p className="text-ink-soft text-base md:text-lg max-w-md leading-relaxed">
            No active goals yet. A goal is a single sentence, a deadline, and the
            patience to outlast it.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-rule">
          {goals.map((g, i) => (
            <li
              key={g.id}
              className="border-b border-r border-rule"
              data-index={String(i + 1).padStart(2, '0')}
            >
              <GoalCard goal={g} now={now} index={i + 1} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
