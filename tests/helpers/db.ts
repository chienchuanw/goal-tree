import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set for integration tests');

const client = postgres(url, { max: 1, prepare: false });
export const testDb = drizzle(client, { schema });
export type TestDb = typeof testDb;

/**
 * Run `fn` inside a transaction and roll back at the end.
 * Use in every integration test to keep tests isolated.
 */
export async function withRollback<T>(
  fn: (tx: Parameters<Parameters<TestDb['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  let captured: T;
  try {
    await testDb.transaction(async (tx) => {
      captured = await fn(tx);
      throw new RollbackSentinel();
    });
  } catch (err) {
    if (!(err instanceof RollbackSentinel)) throw err;
  }
  return captured!;
}

class RollbackSentinel extends Error {}
