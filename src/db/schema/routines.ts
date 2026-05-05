import { pgTable, uuid, text, timestamp, smallint, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { goals } from './goals';

export const routines = pgTable(
  'routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    cadenceType: text('cadence_type').notNull(),
    weekdays: smallint('weekdays').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => ({
    cadenceCheck: check(
      'routines_cadence_chk',
      sql`${t.cadenceType} IN ('daily','weekdays')`,
    ),
    weekdaysCheck: check(
      'routines_weekdays_chk',
      sql`(${t.cadenceType} = 'daily') OR (${t.weekdays} IS NOT NULL AND array_length(${t.weekdays}, 1) BETWEEN 1 AND 7)`,
    ),
    userArchivedIdx: index('routines_user_archived_idx').on(t.userId, t.archivedAt),
  }),
);

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
