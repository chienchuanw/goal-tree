import { z } from 'zod';

export const CreateRoutineSchema = z
  .object({
    title: z.string().min(1).max(200),
    goalId: z.uuid().optional().nullable(),
    cadenceType: z.enum(['daily', 'weekdays']),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
    kind: z.enum(['check', 'quantity']).default('check'),
    unit: z.string().min(1).max(20).optional().nullable(),
    dailyTarget: z.number().int().positive().optional().nullable(),
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
  )
  .refine(
    (v) => (v.kind === 'quantity' ? !!v.unit : !v.unit),
    {
      message: 'unit is required for quantity routines and forbidden for check',
      path: ['unit'],
    },
  );

export const SetRoutineStatusSchema = z.object({
  routineId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(['done', 'partial', 'skipped']).nullable(),
});

export const IncrementRoutineLogSchema = z.object({
  routineId: z.uuid(),
  delta: z.number().int().positive(),
});

export const SetRoutineLogValueSchema = z.object({
  routineId: z.uuid(),
  date: z.iso.date(),
  value: z.number().int().min(0),
});

export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>;
export type SetRoutineStatusInput = z.infer<typeof SetRoutineStatusSchema>;
export type IncrementRoutineLogInput = z.infer<typeof IncrementRoutineLogSchema>;
export type SetRoutineLogValueInput = z.infer<typeof SetRoutineLogValueSchema>;
