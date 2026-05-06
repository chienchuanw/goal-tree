import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals } from '@/db/schema';
import {
  listActiveGoals,
  getGoal,
  createGoal,
  archiveGoal,
} from '@/services/goals';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('listActiveGoals', () => {
  describe('Given a user with no goals', () => {
    describe('When listActiveGoals is called', () => {
      it('Then returns an empty array', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const rows = await listActiveGoals(u.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user A has three active goals and user B has two', () => {
    describe('When listActiveGoals is called for user A', () => {
      it('Then returns only user A rows ordered by deadline_at ASC', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(goals).values([
            { userId: a.id, title: 'A-mid', deadlineAt: future(10) },
            { userId: a.id, title: 'A-late', deadlineAt: future(30) },
            { userId: a.id, title: 'A-soon', deadlineAt: future(2) },
            { userId: b.id, title: 'B-1', deadlineAt: future(5) },
            { userId: b.id, title: 'B-2', deadlineAt: future(6) },
          ]);
          const rows = await listActiveGoals(a.id, tx);
          expect(rows.map((r) => r.title)).toEqual(['A-soon', 'A-mid', 'A-late']);
        });
      });
    });
  });

  describe('Given a user with active, completed, and archived goals', () => {
    describe('When listActiveGoals is called', () => {
      it('Then excludes completed and archived', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await tx.insert(goals).values([
            { userId: u.id, title: 'active', deadlineAt: future(5), status: 'active' },
            { userId: u.id, title: 'done', deadlineAt: future(5), status: 'completed' },
            { userId: u.id, title: 'gone', deadlineAt: future(5), status: 'archived' },
          ]);
          const rows = await listActiveGoals(u.id, tx);
          expect(rows.map((r) => r.title)).toEqual(['active']);
        });
      });
    });
  });
});

describe('getGoal', () => {
  describe('Given a goal owned by user A', () => {
    describe('When getGoal is called by user A', () => {
      it('Then returns the row', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(7) })
            .returning();
          const row = await getGoal(g.id, a.id, tx);
          expect(row?.title).toBe('mine');
        });
      });
    });
  });

  describe('Given a goal owned by user A', () => {
    describe('When getGoal is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(7) })
            .returning();
          const row = await getGoal(g.id, b.id, tx);
          expect(row).toBeNull();
        });
      });
    });
  });
});

describe('createGoal', () => {
  describe('Given valid input', () => {
    describe('When createGoal is called', () => {
      it('Then inserts an active row and returns it', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createGoal(
            {
              title: 'Pass JLPT N3',
              description: 'focus listening',
              deadlineAt: future(30).toISOString(),
            },
            u.id,
            tx,
          );
          expect(created.userId).toBe(u.id);
          expect(created.status).toBe('active');
          expect(created.archivedAt).toBeNull();
          expect(created.title).toBe('Pass JLPT N3');
        });
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When createGoal is called', () => {
      it('Then throws (Zod validation) and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createGoal({ title: '', deadlineAt: future(7).toISOString() }, u.id, tx),
          ).rejects.toThrow();
          const rows = await tx.select().from(goals).where(eq(goals.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given a deadline already in the past', () => {
    describe('When createGoal is called', () => {
      it('Then throws', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          await expect(
            createGoal({ title: 'late', deadlineAt: future(-1).toISOString() }, u.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });
});

describe('archiveGoal', () => {
  describe('Given an active goal owned by user A', () => {
    describe('When archiveGoal is called by user A', () => {
      it('Then status becomes archived and archived_at is set', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'x', deadlineAt: future(5) })
            .returning();
          await archiveGoal(g.id, a.id, tx);
          const [after] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(after.status).toBe('archived');
          expect(after.archivedAt).not.toBeNull();
        });
      });
    });
  });

  describe('Given an already-archived goal', () => {
    describe('When archiveGoal is called again', () => {
      it('Then is a no-op (no error)', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({
              userId: a.id,
              title: 'x',
              deadlineAt: future(5),
              status: 'archived',
              archivedAt: new Date(),
            })
            .returning();
          await expect(archiveGoal(g.id, a.id, tx)).resolves.toBeUndefined();
          const [after] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(after.status).toBe('archived');
        });
      });
    });
  });

  describe('Given a goal owned by user A', () => {
    describe('When archiveGoal is called by user B', () => {
      it('Then user A goal is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: a.id, title: 'mine', deadlineAt: future(5) })
            .returning();
          await archiveGoal(g.id, b.id, tx);
          const [after] = await tx
            .select()
            .from(goals)
            .where(and(eq(goals.id, g.id), eq(goals.userId, a.id)));
          expect(after.status).toBe('active');
          expect(after.archivedAt).toBeNull();
        });
      });
    });
  });
});
