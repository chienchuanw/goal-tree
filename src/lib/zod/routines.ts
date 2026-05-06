import { z } from 'zod';

export const CreateRoutineSchema = z
  .object({
    title: z.string().min(1).max(200),
    goalId: z.uuid().optional().nullable(),
    cadenceType: z.enum(['daily', 'weekdays']),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  })
  .refine(
    (v) =>
      v.cadenceType === 'daily'
        ? !v.weekdays?.length
        : !!v.weekdays?.length,
    {
      message: 'weekdays required when cadenceType=weekdays (and absent for daily)',
      path: ['weekdays'],
    },
  );

export const SetRoutineStatusSchema = z.object({
  routineId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(['done', 'partial', 'skipped']).nullable(),
});

export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>;
export type SetRoutineStatusInput = z.infer<typeof SetRoutineStatusSchema>;
