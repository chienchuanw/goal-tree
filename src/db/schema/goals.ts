import { pgTable, uuid, text, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    check('goals_status_chk', sql`${t.status} IN ('active','completed','archived')`),
    index('goals_user_status_idx').on(t.userId, t.status),
  ],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
