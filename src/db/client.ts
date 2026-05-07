import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const url = env().DATABASE_URL;

// Connect via Neon's pgbouncer pooler; allow a small per-instance pool so
// Promise.all queries within a single request can run in parallel.
// `prepare: false` is required by pgbouncer in transaction mode.
const queryClient = postgres(url, { max: 5, prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type DbOrTx = DB | Tx;
