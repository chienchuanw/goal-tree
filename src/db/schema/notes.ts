import { pgTable, uuid, text, timestamp, smallint, index, check, AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { goals } from './goals';

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => notes.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    bodyMd: text('body_md').notNull().default(''),
    depth: smallint('depth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('notes_depth_chk', sql`${t.depth} BETWEEN 0 AND 2`),
    index('notes_user_parent_idx').on(t.userId, t.parentId),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
