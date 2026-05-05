import { pgTable, uuid, text, timestamp, date, index, check, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { routines } from './routines';

export const routineLogs = pgTable(
  'routine_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routineId: uuid('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
    logDate: date('log_date').notNull(),
    status: text('status').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'routine_logs_status_chk',
      sql`${t.status} IN ('done','partial','skipped')`,
    ),
    uniqueIndex('routine_logs_routine_date_uniq').on(t.routineId, t.logDate),
    index('routine_logs_routine_date_idx').on(t.routineId, t.logDate.desc()),
  ],
);

export type RoutineLog = typeof routineLogs.$inferSelect;
export type NewRoutineLog = typeof routineLogs.$inferInsert;
