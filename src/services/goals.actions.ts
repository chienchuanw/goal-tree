'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { naiveDateTimeToTaipeiIso } from '@/domain/taipei';
import * as svc from './goals';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }
  return session.user.id;
}

export type CreateGoalActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createGoalAction(
  _prev: CreateGoalActionState,
  formData: FormData,
): Promise<CreateGoalActionState> {
  const userId = await requireUserId();

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    description:
      String(formData.get('description') ?? '').trim() || undefined,
    deadlineAt: naiveDateTimeToTaipeiIso(
      String(formData.get('deadlineAt') ?? ''),
    ),
  };

  try {
    const created = await svc.createGoal(raw, userId);
    revalidatePath('/goals');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create goal',
    };
  }
}

export async function archiveGoalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.archiveGoal(id, userId);
  revalidatePath('/goals');
}
