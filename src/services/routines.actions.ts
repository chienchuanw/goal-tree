'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/require-user-id';
import * as svc from './routines';

export type CreateRoutineActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createRoutineAction(
  _prev: CreateRoutineActionState,
  formData: FormData,
): Promise<CreateRoutineActionState> {
  const userId = await requireUserId();

  const isWeekdays = String(formData.get('cadenceType') ?? '') === 'weekdays';
  const goalIdRaw = String(formData.get('goalId') ?? '').trim();
  const weekdaysRaw = formData.getAll('weekdays').map((v) => Number(String(v)));
  const isQuantity = String(formData.get('kind') ?? 'check') === 'quantity';
  const unitRaw = String(formData.get('unit') ?? '').trim();
  const targetRaw = String(formData.get('dailyTarget') ?? '').trim();

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    cadenceType: isWeekdays ? 'weekdays' : 'daily',
    goalId: goalIdRaw === '' ? null : goalIdRaw,
    weekdays: isWeekdays
      ? weekdaysRaw.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      : undefined,
    kind: isQuantity ? 'quantity' : 'check',
    unit: isQuantity ? unitRaw : undefined,
    dailyTarget: isQuantity && targetRaw !== '' ? Number(targetRaw) : undefined,
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
  revalidatePath('/archive');
}

export async function unarchiveRoutineAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.unarchiveRoutine(id, userId);
  revalidatePath('/archive');
  revalidatePath('/today');
}
