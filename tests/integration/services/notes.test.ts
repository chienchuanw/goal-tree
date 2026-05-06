import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals, notes } from '@/db/schema';
import {
  createNote,
  listNoteTree,
  getNote,
  getNoteWithBreadcrumb,
  saveNote,
  renameNote,
  deleteNote,
  setNoteGoal,
  moveNote,
} from '@/services/notes';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('createNote', () => {
  describe('Given parentId=null', () => {
    describe('When createNote is called', () => {
      it('Then inserts at depth 0', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createNote({ title: 'Root' }, u.id, tx);
          expect(created.depth).toBe(0);
          expect(created.parentId).toBeNull();
          expect(created.userId).toBe(u.id);
        });
      });
    });
  });

  describe('Given a depth-0 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then inserts at depth 1', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'Root' }, u.id, tx);
          const child = await createNote({ title: 'Child', parentId: root.id }, u.id, tx);
          expect(child.depth).toBe(1);
          expect(child.parentId).toBe(root.id);
        });
      });
    });
  });

  describe('Given a depth-1 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then inserts at depth 2', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'R' }, u.id, tx);
          const child = await createNote({ title: 'C', parentId: root.id }, u.id, tx);
          const grand = await createNote({ title: 'G', parentId: child.id }, u.id, tx);
          expect(grand.depth).toBe(2);
        });
      });
    });
  });

  describe('Given a depth-2 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then throws and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'R' }, u.id, tx);
          const child = await createNote({ title: 'C', parentId: root.id }, u.id, tx);
          const grand = await createNote({ title: 'G', parentId: child.id }, u.id, tx);
          await expect(
            createNote({ title: 'too-deep', parentId: grand.id }, u.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });

  describe('Given parentId belongs to another user', () => {
    describe('When createNote is called', () => {
      it('Then throws "parent not found"', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const aRoot = await createNote({ title: 'A' }, a.id, tx);
          await expect(
            createNote({ title: 'sneaky', parentId: aRoot.id }, b.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });
});

describe('listNoteTree', () => {
  describe('Given user A has 2 roots and user B has 1', () => {
    describe('When listNoteTree is called for user A', () => {
      it('Then returns only user A rows', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await createNote({ title: 'A1' }, a.id, tx);
          await createNote({ title: 'A2' }, a.id, tx);
          await createNote({ title: 'B1' }, b.id, tx);
          const rows = await listNoteTree(a.id, tx);
          expect(rows.map((r) => r.title).sort()).toEqual(['A1', 'A2']);
        });
      });
    });
  });
});

describe('getNoteWithBreadcrumb', () => {
  describe('Given a depth-2 note owned by user A', () => {
    describe('When getNoteWithBreadcrumb is called by user A', () => {
      it('Then returns the note + breadcrumb root → child → self', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'Root' }, u.id, tx);
          const c = await createNote({ title: 'Child', parentId: r.id }, u.id, tx);
          const g = await createNote({ title: 'Grand', parentId: c.id }, u.id, tx);
          const result = await getNoteWithBreadcrumb(g.id, u.id, tx);
          expect(result?.note.id).toBe(g.id);
          expect(result?.breadcrumb.map((n) => n.id)).toEqual([r.id, c.id, g.id]);
        });
      });
    });
  });

  describe('Given the note belongs to user A', () => {
    describe('When getNoteWithBreadcrumb is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A note' }, a.id, tx);
          const result = await getNoteWithBreadcrumb(n.id, b.id, tx);
          expect(result).toBeNull();
        });
      });
    });
  });
});

describe('saveNote', () => {
  describe('Given a note owned by user A', () => {
    describe('When saveNote is called by user A', () => {
      it('Then updates body_md and title and bumps updated_at', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'Old' }, u.id, tx);
          const before = n.updatedAt;
          // Sleep 10ms so updated_at can change.
          await new Promise((r) => setTimeout(r, 10));
          await saveNote({ id: n.id, title: 'New', bodyMd: '# Hello' }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('New');
          expect(after.bodyMd).toBe('# Hello');
          expect(after.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
      });
    });
  });

  describe('Given a note owned by user A', () => {
    describe('When saveNote is called by user B', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await saveNote({ id: n.id, title: 'hijack', bodyMd: 'pwn' }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('A');
          expect(after.bodyMd).toBe('');
        });
      });
    });
  });
});

describe('renameNote', () => {
  describe('Given owner renames their note', () => {
    describe('When renameNote is called', () => {
      it('Then title is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'Old' }, u.id, tx);
          await renameNote({ id: n.id, title: 'New' }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('New');
        });
      });
    });
  });

  describe('Given user B tries to rename user A note', () => {
    describe('When renameNote is called', () => {
      it('Then user A title is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await renameNote({ id: n.id, title: 'pwn' }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('A');
        });
      });
    });
  });
});

describe('deleteNote', () => {
  describe('Given a depth-0 note with depth-1 child and depth-2 grandchild', () => {
    describe('When the owner deletes the depth-0 note', () => {
      it('Then all three rows are removed (cascade)', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'R' }, u.id, tx);
          const c = await createNote({ title: 'C', parentId: r.id }, u.id, tx);
          await createNote({ title: 'G', parentId: c.id }, u.id, tx);
          await deleteNote(r.id, u.id, tx);
          const rows = await tx.select().from(notes).where(eq(notes.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user B tries to delete user A note', () => {
    describe('When deleteNote is called', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await deleteNote(n.id, b.id, tx);
          const rows = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(rows).toHaveLength(1);
        });
      });
    });
  });
});

describe('setNoteGoal', () => {
  describe('Given owner sets their own goal', () => {
    describe('When setNoteGoal is called', () => {
      it('Then notes.goal_id is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'N' }, u.id, tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'G', deadlineAt: future(7) })
            .returning();
          await setNoteGoal({ id: n.id, goalId: g.id }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBe(g.id);
        });
      });
    });
  });

  describe('Given owner unlinks (goalId=null)', () => {
    describe('When setNoteGoal is called', () => {
      it('Then notes.goal_id becomes null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'G', deadlineAt: future(7) })
            .returning();
          const n = await createNote({ title: 'N', goalId: g.id }, u.id, tx);
          expect(n.goalId).toBe(g.id);
          await setNoteGoal({ id: n.id, goalId: null }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBeNull();
        });
      });
    });
  });

  describe('Given owner tries to link to another user goal', () => {
    describe('When setNoteGoal is called', () => {
      it('Then throws and goal_id is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A note' }, a.id, tx);
          const [bGoal] = await tx
            .insert(goals)
            .values({ userId: b.id, title: 'B', deadlineAt: future(7) })
            .returning();
          await expect(
            setNoteGoal({ id: n.id, goalId: bGoal.id }, a.id, tx),
          ).rejects.toThrow();
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBeNull();
        });
      });
    });
  });
});

describe('moveNote', () => {
  describe('Given a depth-0 leaf moved under a depth-1 parent', () => {
    describe('When moveNote is called', () => {
      it('Then the moved note depth becomes 2', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'R' }, u.id, tx);
          const c = await createNote({ title: 'C', parentId: r.id }, u.id, tx);
          const x = await createNote({ title: 'X' }, u.id, tx);
          await moveNote({ id: x.id, newParentId: c.id }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, x.id));
          expect(after.depth).toBe(2);
          expect(after.parentId).toBe(c.id);
        });
      });
    });
  });

  describe('Given a depth-0 note with a depth-2 descendant', () => {
    describe('When moving it under another depth-0 note (would push descendant to depth 3)', () => {
      it('Then throws and nothing is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const a = await createNote({ title: 'A' }, u.id, tx);
          const aChild = await createNote({ title: 'AC', parentId: a.id }, u.id, tx);
          await createNote({ title: 'AGrand', parentId: aChild.id }, u.id, tx);
          const b = await createNote({ title: 'B' }, u.id, tx);
          await expect(
            moveNote({ id: a.id, newParentId: b.id }, u.id, tx),
          ).rejects.toThrow();
          const [aAfter] = await tx.select().from(notes).where(eq(notes.id, a.id));
          expect(aAfter.depth).toBe(0);
          expect(aAfter.parentId).toBeNull();
        });
      });
    });
  });

  describe('Given user B tries to move user A note', () => {
    describe('When moveNote is called', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await moveNote({ id: n.id, newParentId: null }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.parentId).toBeNull();
          expect(after.userId).toBe(a.id);
        });
      });
    });
  });
});
