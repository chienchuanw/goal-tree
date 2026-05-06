import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const url = env().DATABASE_URL;

// Single connection for serverless; postgres-js handles pooling internally.
const queryClient = postgres(url, { max: 1, prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type DbOrTx = DB | Tx;
