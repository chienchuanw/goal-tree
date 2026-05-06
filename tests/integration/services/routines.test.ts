import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { routines } from '@/db/schema';
import {
  createRoutine,
  listActiveRoutines,
  getRoutine,
  archiveRoutine,
} from '@/services/routines';

describe('createRoutine', () => {
  describe('Given a valid daily routine input', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts a row scoped to the userId with weekdays=null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Read 30 min', cadenceType: 'daily' },
            u.id,
            tx,
          );
          expect(created.userId).toBe(u.id);
          expect(created.cadenceType).toBe('daily');
          expect(created.weekdays).toBeNull();
          expect(created.archivedAt).toBeNull();
        });
      });
    });
  });

  describe('Given a valid weekdays routine input', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts a row with the weekdays array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Run', cadenceType: 'weekdays', weekdays: [1, 3, 5] },
            u.id,
            tx,
          );
          expect(created.weekdays).toEqual([1, 3, 5]);
        });
      });
    });
  });

  describe('Given a null goalId', () => {
    describe('When createRoutine is called', () => {
      it('Then inserts with goalId=null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createRoutine(
            { title: 'Standalone', cadenceType: 'daily', goalId: null },
            u.id,
            tx,
          );
          expect(created.goalId).toBeNull();
        });
      });
    });
  });

  describe('Given a weekdays routine without a weekdays array', () => {
    describe('When createRoutine is called', () => {
      it('Then throws (Zod refinement) and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createRoutine({ title: 'X', cadenceType: 'weekdays' }, u.id, tx),
          ).rejects.toThrow();
          const rows = await tx.select().from(routines).where(eq(routines.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });
});

describe('listActiveRoutines', () => {
  describe('Given a user with no routines', () => {
    describe('When listActiveRoutines is called', () => {
      it('Then returns an empty array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const rows = await listActiveRoutines(u.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user A has two active routines, one archived, and user B has one', () => {
    describe('When listActiveRoutines is called for user A', () => {
      it('Then returns only user A non-archived rows', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(routines).values([
            { userId: a.id, title: 'A1', cadenceType: 'daily' },
            { userId: a.id, title: 'A2', cadenceType: 'daily' },
            { userId: a.id, title: 'A-archived', cadenceType: 'daily', archivedAt: new Date() },
            { userId: b.id, title: 'B1', cadenceType: 'daily' },
          ]);
          const rows = await listActiveRoutines(a.id, tx);
          expect(rows.map((r) => r.title).sort()).toEqual(['A1', 'A2']);
        });
      });
    });
  });
});

describe('getRoutine', () => {
  describe('Given a routine owned by user A', () => {
    describe('When getRoutine is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'mine', cadenceType: 'daily' })
            .returning();
          const fetched = await getRoutine(r.id, b.id, tx);
          expect(fetched).toBeNull();
        });
      });
    });
  });
});

describe('archiveRoutine', () => {
  describe('Given an active routine owned by user A', () => {
    describe('When archiveRoutine is called by user A', () => {
      it('Then archivedAt is set and the row no longer appears in listActiveRoutines', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'x', cadenceType: 'daily' })
            .returning();
          await archiveRoutine(r.id, a.id, tx);
          const [after] = await tx.select().from(routines).where(eq(routines.id, r.id));
          expect(after.archivedAt).not.toBeNull();
          const active = await listActiveRoutines(a.id, tx);
          expect(active).toEqual([]);
        });
      });
    });
  });

  describe('Given an already-archived routine', () => {
    describe('When archiveRoutine is called again by the owner', () => {
      it('Then it is a no-op (archivedAt unchanged) and does not error', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const stamp = new Date('2026-04-01T00:00:00Z');
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'x', cadenceType: 'daily', archivedAt: stamp })
            .returning();
          await expect(archiveRoutine(r.id, a.id, tx)).resolves.toBeUndefined();
          const [after] = await tx.select().from(routines).where(eq(routines.id, r.id));
          expect(after.archivedAt?.getTime()).toBe(stamp.getTime());
        });
      });
    });
  });

  describe('Given a routine owned by user A', () => {
    describe('When archiveRoutine is called by user B', () => {
      it('Then user A routine is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [r] = await tx
            .insert(routines)
            .values({ userId: a.id, title: 'mine', cadenceType: 'daily' })
            .returning();
          await archiveRoutine(r.id, b.id, tx);
          const [after] = await tx
            .select()
            .from(routines)
            .where(and(eq(routines.id, r.id), eq(routines.userId, a.id)));
          expect(after.archivedAt).toBeNull();
        });
      });
    });
  });
});
