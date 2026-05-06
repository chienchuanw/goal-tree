import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, notes, type Note } from '@/db/schema';

export type { Note } from '@/db/schema';
import {
  CreateNoteSchema,
  SaveNoteSchema,
  RenameNoteSchema,
  SetNoteGoalSchema,
  MoveNoteSchema,
} from '@/lib/zod/notes';
import { assembleTree, type FlatNote, type NoteNode } from '@/domain/notes-tree';

export async function getNote(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note | null> {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listNoteTree(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(asc(notes.title));
}

export async function getNoteWithBreadcrumb(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<{ note: Note; breadcrumb: Note[] } | null> {
  const all = await listNoteTree(userId, db);
  const byId = new Map(all.map((n) => [n.id, n]));
  const target = byId.get(id);
  if (!target) return null;

  const breadcrumb: Note[] = [];
  let cursor: Note | undefined = target;
  while (cursor) {
    breadcrumb.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return { note: target, breadcrumb };
}

export async function createNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note> {
  const parsed = CreateNoteSchema.parse(input);

  return db.transaction(async (tx) => {
    let depth = 0;
    if (parsed.parentId) {
      const parent = await getNote(parsed.parentId, userId, tx);
      if (!parent) throw new Error('parent not found');
      if (parent.depth >= 2) throw new Error('cannot nest beyond 3 levels');
      depth = parent.depth + 1;
    }

    if (parsed.goalId) {
      const [g] = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (!g) throw new Error('goal not found');
    }

    const [row] = await tx
      .insert(notes)
      .values({
        userId,
        parentId: parsed.parentId ?? null,
        goalId: parsed.goalId ?? null,
        title: parsed.title,
        depth,
      })
      .returning();
    return row;
  });
}

export async function saveNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = SaveNoteSchema.parse(input);
  await db
    .update(notes)
    .set({
      title: parsed.title,
      bodyMd: parsed.bodyMd,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
}

export async function renameNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = RenameNoteSchema.parse(input);
  await db
    .update(notes)
    .set({ title: parsed.title, updatedAt: sql`clock_timestamp()` })
    .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
}

export async function deleteNote(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // FK ON DELETE CASCADE handles descendants.
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function setNoteGoal(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = SetNoteGoalSchema.parse(input);

  await db.transaction(async (tx) => {
    if (parsed.goalId) {
      const [g] = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (!g) throw new Error('goal not found');
    }
    await tx
      .update(notes)
      .set({ goalId: parsed.goalId, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
  });
}

function flatNoteOf(n: Note): FlatNote {
  return {
    id: n.id,
    parentId: n.parentId,
    title: n.title,
    depth: n.depth,
    goalId: n.goalId,
    updatedAt: n.updatedAt,
  };
}

function collectIds(node: NoteNode, into: string[] = []): string[] {
  into.push(node.id);
  for (const c of node.children) collectIds(c, into);
  return into;
}

function maxDepth(node: NoteNode): number {
  let m = node.depth;
  for (const c of node.children) m = Math.max(m, maxDepth(c));
  return m;
}

export async function moveNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = MoveNoteSchema.parse(input);

  await db.transaction(async (tx) => {
    const moved = await getNote(parsed.id, userId, tx);
    if (!moved) return; // cross-user no-op

    const oldDepth = moved.depth;
    let newDepth = 0;
    if (parsed.newParentId) {
      const parent = await getNote(parsed.newParentId, userId, tx);
      if (!parent) throw new Error('parent not found');
      newDepth = parent.depth + 1;
    }
    const delta = newDepth - oldDepth;

    if (delta !== 0) {
      // Build the user's tree, find the moved node, check its descendants' max depth.
      const all = await listNoteTree(userId, tx);
      const tree = assembleTree(all.map(flatNoteOf));
      const findInTree = (list: NoteNode[]): NoteNode | null => {
        for (const n of list) {
          if (n.id === parsed.id) return n;
          const inChild = findInTree(n.children);
          if (inChild) return inChild;
        }
        return null;
      };
      const movedNode = findInTree(tree);
      if (!movedNode) return; // Belt-and-suspenders.
      if (maxDepth(movedNode) + delta > 2) {
        throw new Error('move would push descendants beyond 3 levels');
      }

      const affectedIds = collectIds(movedNode);
      await tx
        .update(notes)
        .set({ depth: sql`${notes.depth} + ${delta}` })
        .where(and(eq(notes.userId, userId), inArray(notes.id, affectedIds)));
    }

    await tx
      .update(notes)
      .set({ parentId: parsed.newParentId, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
  });
}
