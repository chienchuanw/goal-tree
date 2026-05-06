import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { todayInTaipei } from '@/domain/taipei';
import { listTodayRoutines } from '@/services/today';
import { listActiveGoals } from '@/services/goals';
import { RoutinesGroupedByGoal } from '@/components/routines/RoutinesGroupedByGoal';
import { CreateRoutineDialog } from '@/components/routines/CreateRoutineDialog';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const today = todayInTaipei();
  const [rows, goals] = await Promise.all([
    listTodayRoutines(session.user.id, today),
    listActiveGoals(session.user.id),
  ]);

  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today</h1>
        <CreateRoutineDialog goalOptions={goalOptions} />
      </header>
      {rows.length === 0 ? (
        <p className="text-zinc-600">
          No routines apply today. Create one to get started.
        </p>
      ) : (
        <RoutinesGroupedByGoal rows={rows} today={today} />
      )}
    </section>
  );
}
