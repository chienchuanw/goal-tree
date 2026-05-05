import type { TestDb } from './db';
import { users } from '@/db/schema';

export async function seedUser(
  tx: Parameters<Parameters<TestDb['transaction']>[0]>[0],
  overrides: Partial<{ githubId: string; name: string }> = {},
) {
  const [u] = await tx
    .insert(users)
    .values({
      githubId: overrides.githubId ?? `gh-test-${crypto.randomUUID()}`,
      name: overrides.name ?? 'Test User',
    })
    .returning();
  return u;
}
