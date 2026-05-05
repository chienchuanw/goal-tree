import { describe, it, expect } from 'vitest';
import { withRollback, testDb } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Given a real Postgres connection', () => {
  describe('When seeding a user inside withRollback', () => {
    it('Then the user is visible inside the tx and rolled back after', async () => {
      const seeded = await withRollback(async (tx) => {
        const u = await seedUser(tx);
        const found = await tx.select().from(users).where(eq(users.id, u.id));
        expect(found).toHaveLength(1);
        return u;
      });

      // After rollback the row must be gone.
      const after = await testDb.select().from(users).where(eq(users.id, seeded.id));
      expect(after).toHaveLength(0);
    });
  });
});
