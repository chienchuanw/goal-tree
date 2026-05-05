import { describe, it, expect } from 'vitest';
import {
  todayInTaipei,
  weekdayInTaipei,
  isWithinBackfillWindow,
  TAIPEI_TZ,
} from '@/domain/taipei';

describe('todayInTaipei', () => {
  describe('Given a UTC instant just past Taipei midnight', () => {
    describe('When asked for today in Taipei', () => {
      it('Then returns the next Taipei calendar day as YYYY-MM-DD', () => {
        // 2026-05-04T16:30:00Z = 2026-05-05T00:30:00+08:00
        const now = new Date('2026-05-04T16:30:00Z');
        expect(todayInTaipei(now)).toBe('2026-05-05');
      });
    });
  });

  describe('Given a UTC instant just before Taipei midnight', () => {
    describe('When asked for today in Taipei', () => {
      it('Then returns the prior Taipei calendar day', () => {
        // 2026-05-04T15:30:00Z = 2026-05-04T23:30:00+08:00
        const now = new Date('2026-05-04T15:30:00Z');
        expect(todayInTaipei(now)).toBe('2026-05-04');
      });
    });
  });
});

describe('weekdayInTaipei', () => {
  describe('Given a known Taipei date', () => {
    describe('When asked for the weekday', () => {
      it('Then returns 0 (Sun) .. 6 (Sat)', () => {
        // 2026-05-05 is a Tuesday in Taipei (day 2)
        expect(weekdayInTaipei(new Date('2026-05-04T16:30:00Z'))).toBe(2);
      });
    });
  });
});

describe('isWithinBackfillWindow', () => {
  describe('Given today is 2026-05-05 in Taipei', () => {
    const now = new Date('2026-05-04T16:30:00Z'); // Taipei 2026-05-05 00:30

    describe('When the target date is today', () => {
      it('Then allows', () => {
        expect(isWithinBackfillWindow('2026-05-05', now)).toBe(true);
      });
    });

    describe('When the target date is 2 days ago', () => {
      it('Then allows', () => {
        expect(isWithinBackfillWindow('2026-05-03', now)).toBe(true);
      });
    });

    describe('When the target date is 3 days ago', () => {
      it('Then rejects', () => {
        expect(isWithinBackfillWindow('2026-05-02', now)).toBe(false);
      });
    });

    describe('When the target date is in the future', () => {
      it('Then rejects', () => {
        expect(isWithinBackfillWindow('2026-05-06', now)).toBe(false);
      });
    });
  });
});

describe('TAIPEI_TZ', () => {
  it('exports the IANA name', () => {
    expect(TAIPEI_TZ).toBe('Asia/Taipei');
  });
});
