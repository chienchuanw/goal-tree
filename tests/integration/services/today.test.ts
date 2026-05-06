import { describe, it, expect } from 'vitest';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals, routines, routineLogs } from '@/db/schema';
import { listTodayRoutines } from '@/services/today';
import { todayInTaipei, weekdayInTaipei } from '@/domain/taipei';

describe('listTodayRoutines', () => {
  describe("Given a user with one daily routine, one weekday routine that doesn't apply today, and one archived routine", () => {
    describe('When listTodayRoutines is called', () => {
      it('Then returns only the daily routine with its 30-day heatmap and streak', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const weekdayToday = weekdayInTaipei();
          // a weekday set that excludes today
          const otherWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== weekdayToday).slice(0, 2);

          await tx.insert(routines).values([
            { userId: u.id, title: 'Daily', cadenceType: 'daily' },
            { userId: u.id, title: 'OtherWeekdays', cadenceType: 'weekdays', weekdays: otherWeekdays },
            { userId: u.id, title: 'Archived', cadenceType: 'daily', archivedAt: new Date() },
          ]);

          const rows = await listTodayRoutines(u.id, today, tx);
          expect(rows.map((r) => r.routine.title)).toEqual(['Daily']);
          expect(rows[0]!.heatmap).toHaveLength(30);
          expect(rows[0]!.streak).toBe(0);
        });
      });
    });
  });

  describe('Given a daily routine with done logs for today, yesterday, and two days ago', () => {
    describe('When listTodayRoutines is called', () => {
      it('Then streak is 3 and todayLog reflects done', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const day = (delta: number) =>
            new Date(Date.parse(today + 'T00:00:00Z') + delta * 86_400_000)
              .toISOString()
              .slice(0, 10);

          const [r] = await tx
            .insert(routines)
            .values({ userId: u.id, title: 'Daily', cadenceType: 'daily' })
            .returning();
          await tx.insert(routineLogs).values([
            { routineId: r.id, logDate: day(0), status: 'done' },
            { routineId: r.id, logDate: day(-1), status: 'done' },
            { routineId: r.id, logDate: day(-2), status: 'done' },
          ]);

          const rows = await listTodayRoutines(u.id, today, tx);
          expect(rows[0]!.streak).toBe(3);
          expect(rows[0]!.todayLog?.status).toBe('done');
        });
      });
    });
  });

  describe('Given two routines under one goal and one without a goal', () => {
    describe('When listTodayRoutines is called', () => {
      it('Then each row carries goalTitle (or null) so the page can group', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const today = todayInTaipei();
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'Ship MVP', deadlineAt: new Date(Date.now() + 30 * 86_400_000) })
            .returning();
          await tx.insert(routines).values([
            { userId: u.id, goalId: g.id, title: 'A', cadenceType: 'daily' },
            { userId: u.id, goalId: g.id, title: 'B', cadenceType: 'daily' },
            { userId: u.id, title: 'C', cadenceType: 'daily' },
          ]);
          const rows = await listTodayRoutines(u.id, today, tx);
          const titles = rows.map((r) => [r.routine.title, r.goalTitle]);
          expect(titles).toEqual(
            expect.arrayContaining([
              ['A', 'Ship MVP'],
              ['B', 'Ship MVP'],
              ['C', null],
            ]),
          );
        });
      });
    });
  });

  describe('Given user A and user B each with one daily routine', () => {
    describe('When listTodayRoutines is called for user A', () => {
      it('Then user B routine never appears', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await tx.insert(routines).values([
            { userId: a.id, title: 'A', cadenceType: 'daily' },
            { userId: b.id, title: 'B', cadenceType: 'daily' },
          ]);
          const rows = await listTodayRoutines(a.id, todayInTaipei(), tx);
          expect(rows.map((r) => r.routine.title)).toEqual(['A']);
        });
      });
    });
  });
});
