import { pgTable, uuid, text, timestamp, smallint, integer, index, check } from 'drizzle-orm/pg-core';
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
    kind: text('kind').notNull().default('check'),
    unit: text('unit'),
    dailyTarget: integer('daily_target'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    check('routines_cadence_chk', sql`${t.cadenceType} IN ('daily','weekdays')`),
    check(
      'routines_weekdays_chk',
      sql`(${t.cadenceType} = 'daily') OR (${t.weekdays} IS NOT NULL AND array_length(${t.weekdays}, 1) BETWEEN 1 AND 7)`,
    ),
    check('routines_kind_chk', sql`${t.kind} IN ('check','quantity')`),
    check(
      'routines_quantity_unit_chk',
      sql`(${t.kind} = 'check' AND ${t.unit} IS NULL) OR (${t.kind} = 'quantity' AND ${t.unit} IS NOT NULL)`,
    ),
    check('routines_daily_target_chk', sql`${t.dailyTarget} IS NULL OR ${t.dailyTarget} > 0`),
    index('routines_user_archived_idx').on(t.userId, t.archivedAt),
  ],
);

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
