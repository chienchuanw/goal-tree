import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals } from '@/db/schema';
import {
  createGoal,
  archiveGoal,
  unarchiveGoal,
  listArchivedGoals,
} from '@/services/goals';

const FUTURE = '2030-01-01T00:00:00+08:00';

describe('unarchiveGoal', () => {
  describe('Given an archived goal owned by the user', () => {
    describe('When unarchiveGoal is called', () => {
      it('Then resets status to active AND clears archivedAt', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const g = await createGoal(
            { title: 'Ship', deadlineAt: FUTURE },
            u.id,
            tx,
          );
          await archiveGoal(g.id, u.id, tx);
          await unarchiveGoal(g.id, u.id, tx);
          const [row] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(row.status).toBe('active');
          expect(row.archivedAt).toBeNull();
        });
      });
    });
  });

  describe('Given an active goal', () => {
    describe('When unarchiveGoal is called', () => {
      it('Then it is a no-op', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const g = await createGoal(
            { title: 'Ship', deadlineAt: FUTURE },
            u.id,
            tx,
          );
          await unarchiveGoal(g.id, u.id, tx);
          const [row] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(row.status).toBe('active');
        });
      });
    });
  });

  describe('Given an archived goal owned by a different user', () => {
    describe('When unarchiveGoal is called with the wrong userId', () => {
      it('Then it is a silent no-op', async () => {
        await withRollback(async (tx) => {
          const owner = await seedUser(tx);
          const other = await seedUser(tx);
          const g = await createGoal(
            { title: 'Ship', deadlineAt: FUTURE },
            owner.id,
            tx,
          );
          await archiveGoal(g.id, owner.id, tx);
          await unarchiveGoal(g.id, other.id, tx);
          const [row] = await tx
            .select()
            .from(goals)
            .where(eq(goals.id, g.id));
          expect(row.status).toBe('archived');
        });
      });
    });
  });
});

describe('listArchivedGoals', () => {
  describe('Given the user has 2 archived and 1 active goal', () => {
    describe('When listArchivedGoals is called', () => {
      it('Then returns only the 2 archived rows ordered by archivedAt DESC', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const a = await createGoal(
            { title: 'A', deadlineAt: FUTURE },
            u.id,
            tx,
          );
          const b = await createGoal(
            { title: 'B', deadlineAt: FUTURE },
            u.id,
            tx,
          );
          await createGoal({ title: 'C', deadlineAt: FUTURE }, u.id, tx);
          await archiveGoal(a.id, u.id, tx);
          await archiveGoal(b.id, u.id, tx);
          // Force deterministic archivedAt ordering — avoids timing flakiness in CI.
          await tx
            .update(goals)
            .set({ archivedAt: new Date('2026-01-01T00:00:00Z') })
            .where(eq(goals.id, a.id));
          await tx
            .update(goals)
            .set({ archivedAt: new Date('2026-01-02T00:00:00Z') })
            .where(eq(goals.id, b.id));
          const rows = await listArchivedGoals(u.id, tx);
          expect(rows.map((g) => g.title)).toEqual(['B', 'A']);
        });
      });
    });
  });

  describe('Given another user has archived goals', () => {
    describe('When listArchivedGoals is called for this user', () => {
      it('Then excludes the other user’s rows', async () => {
        await withRollback(async (tx) => {
          const me = await seedUser(tx);
          const other = await seedUser(tx);
          const g = await createGoal(
            { title: 'Theirs', deadlineAt: FUTURE },
            other.id,
            tx,
          );
          await archiveGoal(g.id, other.id, tx);
          const rows = await listArchivedGoals(me.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });
});
