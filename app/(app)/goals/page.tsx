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

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Goals</h1>
        <CreateGoalDialog />
      </header>

      {goals.length === 0 ? (
        <p className="text-zinc-600">No active goals yet. Create your first one.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
