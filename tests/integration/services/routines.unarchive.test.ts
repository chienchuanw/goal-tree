import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { routines } from '@/db/schema';
import {
  createRoutine,
  archiveRoutine,
  unarchiveRoutine,
  listArchivedRoutines,
} from '@/services/routines';

describe('unarchiveRoutine', () => {
  describe('Given an archived routine owned by the user', () => {
    describe('When unarchiveRoutine is called', () => {
      it('Then clears archivedAt', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createRoutine(
            { title: 'Read', cadenceType: 'daily' },
            u.id,
            tx,
          );
          await archiveRoutine(r.id, u.id, tx);
          await unarchiveRoutine(r.id, u.id, tx);
          const [row] = await tx
            .select()
            .from(routines)
            .where(eq(routines.id, r.id));
          expect(row.archivedAt).toBeNull();
        });
      });
    });
  });

  describe('Given an active routine', () => {
    describe('When unarchiveRoutine is called', () => {
      it('Then it is a no-op (idempotent)', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createRoutine(
            { title: 'Read', cadenceType: 'daily' },
            u.id,
            tx,
          );
          await unarchiveRoutine(r.id, u.id, tx);
          const [row] = await tx
            .select()
            .from(routines)
            .where(eq(routines.id, r.id));
          expect(row.archivedAt).toBeNull();
        });
      });
    });
  });

  describe('Given an archived routine owned by a different user', () => {
    describe('When unarchiveRoutine is called with the wrong userId', () => {
      it('Then it is a silent no-op (row stays archived)', async () => {
        await withRollback(async (tx) => {
          const owner = await seedUser(tx);
          const other = await seedUser(tx);
          const r = await createRoutine(
            { title: 'Read', cadenceType: 'daily' },
            owner.id,
            tx,
          );
          await archiveRoutine(r.id, owner.id, tx);
          await unarchiveRoutine(r.id, other.id, tx);
          const [row] = await tx
            .select()
            .from(routines)
            .where(eq(routines.id, r.id));
          expect(row.archivedAt).not.toBeNull();
        });
      });
    });
  });
});

describe('listArchivedRoutines', () => {
  describe('Given the user has 2 archived and 1 active routine', () => {
    describe('When listArchivedRoutines is called', () => {
      it('Then returns only the 2 archived rows ordered by archivedAt DESC', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const a = await createRoutine(
            { title: 'A', cadenceType: 'daily' },
            u.id,
            tx,
          );
          const b = await createRoutine(
            { title: 'B', cadenceType: 'daily' },
            u.id,
            tx,
          );
          await createRoutine(
            { title: 'C', cadenceType: 'daily' },
            u.id,
            tx,
          );
          await archiveRoutine(a.id, u.id, tx);
          await archiveRoutine(b.id, u.id, tx);
          // Force deterministic archivedAt ordering — avoids timing flakiness in CI.
          await tx
            .update(routines)
            .set({ archivedAt: new Date('2026-01-01T00:00:00Z') })
            .where(eq(routines.id, a.id));
          await tx
            .update(routines)
            .set({ archivedAt: new Date('2026-01-02T00:00:00Z') })
            .where(eq(routines.id, b.id));

          const rows = await listArchivedRoutines(u.id, tx);
          expect(rows.map((r) => r.title)).toEqual(['B', 'A']);
        });
      });
    });
  });

  describe('Given another user has archived routines', () => {
    describe('When listArchivedRoutines is called for this user', () => {
      it('Then excludes the other user’s rows', async () => {
        await withRollback(async (tx) => {
          const me = await seedUser(tx);
          const other = await seedUser(tx);
          const r = await createRoutine(
            { title: 'Theirs', cadenceType: 'daily' },
            other.id,
            tx,
          );
          await archiveRoutine(r.id, other.id, tx);
          const rows = await listArchivedRoutines(me.id, tx);
          expect(rows).toEqual([]);
        });
      });
    });
  });
});
