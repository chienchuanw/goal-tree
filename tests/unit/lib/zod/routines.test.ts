import { describe, it, expect } from 'vitest';
import {
  CreateRoutineSchema,
  SetRoutineStatusSchema,
  IncrementRoutineLogSchema,
  SetRoutineLogValueSchema,
} from '@/lib/zod/routines';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateRoutineSchema', () => {
  describe('Given a valid daily routine', () => {
    describe('When parsed', () => {
      it('Then returns the typed object', () => {
        const result = CreateRoutineSchema.parse({
          title: 'Read 30 min',
          cadenceType: 'daily',
        });
        expect(result.title).toBe('Read 30 min');
        expect(result.cadenceType).toBe('daily');
      });
    });
  });

  describe('Given a valid weekdays routine', () => {
    describe('When parsed', () => {
      it('Then returns the typed object', () => {
        const result = CreateRoutineSchema.parse({
          title: 'Run',
          cadenceType: 'weekdays',
          weekdays: [1, 3, 5],
        });
        expect(result.weekdays).toEqual([1, 3, 5]);
      });
    });
  });

  describe('Given a weekdays routine with no weekdays array', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({ title: 'Run', cadenceType: 'weekdays' }),
        ).toThrow();
      });
    });
  });

  describe('Given a daily routine with weekdays array', () => {
    describe('When parsed', () => {
      it('Then throws (weekdays must be absent for daily)', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'Run',
            cadenceType: 'daily',
            weekdays: [1, 3],
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({ title: '', cadenceType: 'daily' }),
        ).toThrow();
      });
    });
  });

  describe('Given a weekday number out of range', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'Run',
            cadenceType: 'weekdays',
            weekdays: [7],
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a goalId that is a valid uuid', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const goalId = '550e8400-e29b-41d4-a716-446655440000';
        const result = CreateRoutineSchema.parse({
          title: 'X',
          cadenceType: 'daily',
          goalId,
        });
        expect(result.goalId).toBe(goalId);
      });
    });
  });

  describe('Given a goalId that is not a uuid', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateRoutineSchema.parse({
            title: 'X',
            cadenceType: 'daily',
            goalId: 'not-a-uuid',
          }),
        ).toThrow();
      });
    });
  });
});

describe('SetRoutineStatusSchema', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('Given each valid status', () => {
    describe('When parsed', () => {
      it('Then accepts done, partial, skipped, and null', () => {
        for (const status of ['done', 'partial', 'skipped', null] as const) {
          const result = SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026-05-06',
            status,
          });
          expect(result.status).toBe(status);
        }
      });
    });
  });

  describe('Given a malformed date', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026/05/06',
            status: 'done',
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a non-uuid routineId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: 'not-a-uuid',
            date: '2026-05-06',
            status: 'done',
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an unknown status string', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SetRoutineStatusSchema.parse({
            routineId: uuid,
            date: '2026-05-06',
            status: 'maybe',
          }),
        ).toThrow();
      });
    });
  });
});

describe('CreateRoutineSchema — quantity kind', () => {
  const base = { title: 'Exercise', cadenceType: 'daily' as const };

  it('accepts a quantity routine with unit', () => {
    expect(
      CreateRoutineSchema.safeParse({ ...base, kind: 'quantity', unit: 'min' }).success,
    ).toBe(true);
  });

  it('accepts a quantity routine with unit + dailyTarget', () => {
    expect(
      CreateRoutineSchema.safeParse({
        ...base,
        kind: 'quantity',
        unit: 'min',
        dailyTarget: 30,
      }).success,
    ).toBe(true);
  });

  it('rejects a quantity routine without unit', () => {
    expect(CreateRoutineSchema.safeParse({ ...base, kind: 'quantity' }).success).toBe(false);
  });

  it('rejects a check routine with unit set', () => {
    expect(
      CreateRoutineSchema.safeParse({ ...base, kind: 'check', unit: 'min' }).success,
    ).toBe(false);
  });

  it('rejects dailyTarget <= 0', () => {
    expect(
      CreateRoutineSchema.safeParse({
        ...base,
        kind: 'quantity',
        unit: 'min',
        dailyTarget: 0,
      }).success,
    ).toBe(false);
  });

  it('defaults kind to "check" when omitted', () => {
    const result = CreateRoutineSchema.parse(base);
    expect(result.kind).toBe('check');
  });
});

describe('IncrementRoutineLogSchema', () => {
  it('rejects non-positive delta', () => {
    expect(
      IncrementRoutineLogSchema.safeParse({ routineId: UUID, delta: 0 }).success,
    ).toBe(false);
    expect(
      IncrementRoutineLogSchema.safeParse({ routineId: UUID, delta: -1 }).success,
    ).toBe(false);
  });

  it('accepts a positive integer delta', () => {
    expect(
      IncrementRoutineLogSchema.safeParse({ routineId: UUID, delta: 15 }).success,
    ).toBe(true);
  });
});

describe('SetRoutineLogValueSchema', () => {
  it('accepts value=0 (caller treats this as clear)', () => {
    expect(
      SetRoutineLogValueSchema.safeParse({
        routineId: UUID,
        date: '2026-05-08',
        value: 0,
      }).success,
    ).toBe(true);
  });

  it('rejects negative value', () => {
    expect(
      SetRoutineLogValueSchema.safeParse({
        routineId: UUID,
        date: '2026-05-08',
        value: -1,
      }).success,
    ).toBe(false);
  });
});
