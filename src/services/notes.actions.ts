'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/require-user-id';
import type { FormActionState } from './action-state';
import * as svc from './notes';

export type CreateNoteActionState = FormActionState;
export type RenameNoteActionState = FormActionState;
export type MoveNoteActionState = FormActionState;

export type SaveNoteResult = { status: 'ok' } | { status: 'error'; message: string };

export async function createNoteAction(
  _prev: CreateNoteActionState,
  formData: FormData,
): Promise<CreateNoteActionState> {
  const userId = await requireUserId();

  const parentIdRaw = String(formData.get('parentId') ?? '').trim();
  const goalIdRaw = String(formData.get('goalId') ?? '').trim();

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    parentId: parentIdRaw === '' ? null : parentIdRaw,
    goalId: goalIdRaw === '' ? null : goalIdRaw,
  };

  try {
    const created = await svc.createNote(raw, userId);
    revalidatePath('/notes');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create note',
    };
  }
}

export async function saveNoteAction(
  id: string,
  title: string,
  bodyMd: string,
): Promise<SaveNoteResult> {
  const userId = await requireUserId();
  try {
    await svc.saveNote({ id, title, bodyMd }, userId);
    revalidatePath('/notes');
    revalidatePath(`/notes/${id}`);
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not save note',
    };
  }
}

export async function renameNoteAction(
  _prev: RenameNoteActionState,
  formData: FormData,
): Promise<RenameNoteActionState> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  try {
    await svc.renameNote({ id, title }, userId);
    revalidatePath('/notes');
    revalidatePath(`/notes/${id}`);
    return { status: 'success', id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not rename note',
    };
  }
}

export async function deleteNoteAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.deleteNote(id, userId);
  revalidatePath('/notes');
}

export async function setNoteGoalAction(
  id: string,
  goalId: string | null,
): Promise<SaveNoteResult> {
  const userId = await requireUserId();
  try {
    await svc.setNoteGoal({ id, goalId }, userId);
    revalidatePath(`/notes/${id}`);
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not link goal',
    };
  }
}

export async function moveNoteAction(
  _prev: MoveNoteActionState,
  formData: FormData,
): Promise<MoveNoteActionState> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const newParentRaw = String(formData.get('newParentId') ?? '').trim();
  const newParentId = newParentRaw === '' ? null : newParentRaw;
  try {
    await svc.moveNote({ id, newParentId }, userId);
    revalidatePath('/notes');
    return { status: 'success', id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not move note',
    };
  }
}
