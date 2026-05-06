import { z } from 'zod';

export const CreateNoteSchema = z.object({
  title: z.string().min(1).max(200),
  parentId: z.uuid().optional().nullable(),
  goalId: z.uuid().optional().nullable(),
});

export const SaveNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  bodyMd: z.string().max(100_000),
});

export const RenameNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
});

export const SetNoteGoalSchema = z.object({
  id: z.uuid(),
  goalId: z.uuid().nullable(),
});

export const MoveNoteSchema = z.object({
  id: z.uuid(),
  newParentId: z.uuid().nullable(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type SaveNoteInput = z.infer<typeof SaveNoteSchema>;
export type RenameNoteInput = z.infer<typeof RenameNoteSchema>;
export type SetNoteGoalInput = z.infer<typeof SetNoteGoalSchema>;
export type MoveNoteInput = z.infer<typeof MoveNoteSchema>;
