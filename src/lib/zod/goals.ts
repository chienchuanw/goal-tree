import { z } from 'zod';

export const CreateGoalSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    deadlineAt: z
      .iso
      .datetime({ offset: true })
      .transform((s) => new Date(s)),
  })
  .refine((v) => v.deadlineAt.getTime() > Date.now(), {
    message: 'deadlineAt must be in the future',
    path: ['deadlineAt'],
  });

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
