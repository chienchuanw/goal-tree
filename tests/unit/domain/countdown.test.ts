import { describe, it, expect } from 'vitest';
import { daysUntil, hoursMinutesUntil } from '@/domain/countdown';
import { TAIPEI_TZ } from '@/domain/taipei';

describe('daysUntil', () => {
  describe('Given a deadline 23 calendar days ahead in Asia/Taipei', () => {
    describe('When called with default timezone', () => {
      it('Then returns 23', () => {
        const now = new Date('2026-05-05T04:00:00Z'); // 12:00 Taipei 2026-05-05
        const deadline = new Date('2026-05-28T04:00:00Z'); // 12:00 Taipei 2026-05-28
        expect(daysUntil(deadline, now)).toBe(23);
      });
    });
  });

  describe('Given the deadline and now fall on the same Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns 0', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date('2026-05-05T15:30:00Z');
        expect(daysUntil(deadline, now)).toBe(0);
      });
    });
  });

  describe('Given the deadline is the next Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns 1', () => {
        const now = new Date('2026-05-04T15:30:00Z');
        const deadline = new Date('2026-05-04T16:30:00Z');
        expect(daysUntil(deadline, now)).toBe(1);
      });
    });
  });

  describe('Given the deadline resolved to an earlier Taipei calendar day', () => {
    describe('When called', () => {
      it('Then returns a negative integer equal to the calendar-day delta', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date('2026-05-03T04:00:00Z');
        expect(daysUntil(deadline, now)).toBe(-2);
      });
    });
  });

  describe('Given an explicit Asia/Taipei timezone parameter', () => {
    describe('When called with TAIPEI_TZ', () => {
      it('Then matches the default-tz behavior', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date('2026-05-28T04:00:00Z');
        expect(daysUntil(deadline, now, TAIPEI_TZ)).toBe(23);
      });
    });
  });
});

describe('hoursMinutesUntil', () => {
  describe('Given exactly 4 hours and 23 minutes remaining', () => {
    describe('When called', () => {
      it('Then returns { hours: 4, minutes: 23 }', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date(now.getTime() + (4 * 60 + 23) * 60_000);
        expect(hoursMinutesUntil(deadline, now)).toEqual({ hours: 4, minutes: 23 });
      });
    });
  });

  describe('Given the deadline is exactly now', () => {
    describe('When called', () => {
      it('Then returns { hours: 0, minutes: 0 }', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        expect(hoursMinutesUntil(now, now)).toEqual({ hours: 0, minutes: 0 });
      });
    });
  });

  describe('Given the deadline is in the past', () => {
    describe('When called', () => {
      it('Then clamps both fields to zero', () => {
        const now = new Date('2026-05-05T04:00:00Z');
        const deadline = new Date(now.getTime() - 60 * 60_000);
        expect(hoursMinutesUntil(deadline, now)).toEqual({ hours: 0, minutes: 0 });
      });
    });
  });
});
