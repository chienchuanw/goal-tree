import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, type Goal } from '@/db/schema';
import { CreateGoalSchema, type CreateGoalInput } from '@/lib/zod/goals';

export async function listActiveGoals(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, 'active')))
    .orderBy(asc(goals.deadlineAt));
}

export async function getGoal(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createGoal(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal> {
  const parsed: CreateGoalInput = CreateGoalSchema.parse(input);
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      title: parsed.title,
      description: parsed.description ?? null,
      deadlineAt: parsed.deadlineAt,
    })
    .returning();
  return row;
}

export async function archiveGoal(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // Scope by id AND userId AND status='active' so:
  //  - cross-user calls match zero rows (silent no-op)
  //  - already-archived rows match zero rows (idempotent)
  await db
    .update(goals)
    .set({ status: 'archived', archivedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.userId, userId),
        eq(goals.status, 'active'),
      ),
    );
}

export async function unarchiveGoal(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // Goals use BOTH status enum and archivedAt — reset both.
  // Predicate on status='archived' makes this idempotent + cross-user-safe.
  await db
    .update(goals)
    .set({ status: 'active', archivedAt: null })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.userId, userId),
        eq(goals.status, 'archived'),
      ),
    );
}

export async function listArchivedGoals(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, 'archived')))
    .orderBy(desc(goals.archivedAt));
}
