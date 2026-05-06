'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import * as svc from './routines';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  return session.user.id;
}

export type CreateRoutineActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createRoutineAction(
  _prev: CreateRoutineActionState,
  formData: FormData,
): Promise<CreateRoutineActionState> {
  const userId = await requireUserId();

  const cadenceType = String(formData.get('cadenceType') ?? '');
  const goalIdRaw = String(formData.get('goalId') ?? '').trim();
  const weekdaysRaw = formData.getAll('weekdays').map((v) => Number(String(v)));

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    cadenceType: cadenceType === 'weekdays' ? 'weekdays' : 'daily',
    goalId: goalIdRaw === '' ? null : goalIdRaw,
    weekdays:
      cadenceType === 'weekdays'
        ? weekdaysRaw.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        : undefined,
  };

  try {
    const created = await svc.createRoutine(raw, userId);
    revalidatePath('/today');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create routine',
    };
  }
}

export async function archiveRoutineAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.archiveRoutine(id, userId);
  revalidatePath('/today');
}
