import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { routines, type Routine } from '@/db/schema';
import { CreateRoutineSchema } from '@/lib/zod/routines';

export async function listActiveRoutines(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine[]> {
  return db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, userId), isNull(routines.archivedAt)))
    .orderBy(asc(routines.createdAt));
}

export async function getRoutine(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine | null> {
  const rows = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), eq(routines.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRoutine(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Routine> {
  const parsed = CreateRoutineSchema.parse(input);
  const [row] = await db
    .insert(routines)
    .values({
      userId,
      goalId: parsed.goalId ?? null,
      title: parsed.title,
      cadenceType: parsed.cadenceType,
      weekdays: parsed.cadenceType === 'weekdays' ? parsed.weekdays! : null,
    })
    .returning();
  return row;
}

export async function archiveRoutine(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // Scoped WHERE makes this idempotent + a silent no-op for cross-user calls.
  await db
    .update(routines)
    .set({ archivedAt: sql`now()` })
    .where(
      and(
        eq(routines.id, id),
        eq(routines.userId, userId),
        isNull(routines.archivedAt),
      ),
    );
}
