'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { SetRoutineStatusSchema } from '@/lib/zod/routines';
import { setRoutineStatus } from './routine_logs';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  return session.user.id;
}

export type SetStatusResult =
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function setRoutineStatusAction(
  routineId: string,
  date: string,
  status: 'done' | 'partial' | 'skipped' | null,
): Promise<SetStatusResult> {
  const userId = await requireUserId();
  const parsed = SetRoutineStatusSchema.safeParse({ routineId, date, status });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'invalid input' };
  }
  try {
    await setRoutineStatus(parsed.data.routineId, userId, parsed.data.date, parsed.data.status);
    revalidatePath('/today');
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not update status',
    };
  }
}
