import { describe, it, expect } from 'vitest';
import { streakLength, build30DayHeatmap, type LogStatus } from '@/domain/streak';

const log = (date: string, status: LogStatus) => ({ logDate: date, status });

// Helper: always-true predicate (daily routine).
const allDays = (_d: string) => true;

// Helper: only weekdays {1,3,5} (Mon/Wed/Fri) apply.
const mwf = (d: string) => [1, 3, 5].includes(new Date(d + 'T00:00:00Z').getUTCDay());

describe('streakLength', () => {
  describe('Given no logs', () => {
    describe('When called', () => {
      it('Then returns 0', () => {
        expect(streakLength([], '2026-05-06', allDays)).toBe(0);
      });
    });
  });

  describe('Given today done with two prior consecutive done days', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 3', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'done'),
          log('2026-05-04', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(3);
      });
    });
  });

  describe('Given today is unmarked (no log) and yesterday was done', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 0 — today must be marked to count', () => {
        const logs = [log('2026-05-05', 'done'), log('2026-05-04', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(0);
      });
    });
  });

  describe('Given today=done, yesterday=skipped, two-days-ago=done', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 1 — skipped breaks the streak', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'skipped'),
          log('2026-05-04', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(1);
      });
    });
  });

  describe('Given partial counts as kept', () => {
    describe('When today=partial and yesterday=done', () => {
      it('Then returns 2', () => {
        const logs = [log('2026-05-06', 'partial'), log('2026-05-05', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(2);
      });
    });
  });

  describe('Given a missing day in between', () => {
    describe('When today=done, yesterday=missing, two-days-ago=done', () => {
      it('Then returns 1 — gap breaks the streak', () => {
        const logs = [log('2026-05-06', 'done'), log('2026-05-04', 'done')];
        expect(streakLength(logs, '2026-05-06', allDays)).toBe(1);
      });
    });
  });

  describe('Given a weekday {1,3,5} (Mon/Wed/Fri) routine', () => {
    // 2026-05-06 = Wed, 05-05 = Tue (na), 05-04 = Mon, 05-03 = Sun (na), 05-02 = Sat (na), 05-01 = Fri
    describe('When today=Wed=done, last Mon=done, last Fri=done', () => {
      it('Then returns 3 — non-applicable days are transparent', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-04', 'done'),
          log('2026-05-01', 'done'),
        ];
        expect(streakLength(logs, '2026-05-06', mwf)).toBe(3);
      });
    });

    describe('When today (Wed) is unmarked', () => {
      it('Then returns 0', () => {
        const logs = [log('2026-05-04', 'done'), log('2026-05-01', 'done')];
        expect(streakLength(logs, '2026-05-06', mwf)).toBe(0);
      });
    });
  });
});

describe('build30DayHeatmap', () => {
  describe('Given an empty log set', () => {
    describe('When called for a daily routine', () => {
      it('Then returns 30 cells of status "none", oldest first', () => {
        const cells = build30DayHeatmap([], '2026-05-06', allDays);
        expect(cells).toHaveLength(30);
        expect(cells.every((c) => c.status === 'none')).toBe(true);
        expect(cells[0]!.date).toBe('2026-04-07'); // today - 29
        expect(cells[29]!.date).toBe('2026-05-06');
      });
    });
  });

  describe('Given mixed logs over the last 30 days', () => {
    describe('When called for a daily routine', () => {
      it('Then each cell reflects its log status, others "none"', () => {
        const logs = [
          log('2026-05-06', 'done'),
          log('2026-05-05', 'partial'),
          log('2026-05-04', 'skipped'),
        ];
        const cells = build30DayHeatmap(logs, '2026-05-06', allDays);
        expect(cells[29]!.status).toBe('done');
        expect(cells[28]!.status).toBe('partial');
        expect(cells[27]!.status).toBe('skipped');
        expect(cells[26]!.status).toBe('none');
      });
    });
  });

  describe('Given a weekday {1,3,5} routine', () => {
    describe('When called', () => {
      it('Then non-Mon/Wed/Fri cells are classified "na"', () => {
        const cells = build30DayHeatmap([], '2026-05-06', mwf);
        // 2026-05-06 = Wed → applicable → "none" (no log)
        expect(cells[29]!.status).toBe('none');
        // 2026-05-05 = Tue → not applicable → "na"
        expect(cells[28]!.status).toBe('na');
        // 2026-05-04 = Mon → applicable → "none"
        expect(cells[27]!.status).toBe('none');
      });
    });
  });
});
