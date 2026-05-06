import { describe, it, expect } from 'vitest';
import { appliesOn } from '@/domain/cadence';

describe('appliesOn', () => {
  describe('Given a daily routine', () => {
    describe('When called with any date', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'daily', weekdays: null }, '2026-05-06')).toBe(true);
        expect(appliesOn({ cadenceType: 'daily', weekdays: null }, '2026-05-10')).toBe(true);
      });
    });
  });

  describe('Given a weekdays routine matching {1,3,5} (Mon/Wed/Fri)', () => {
    describe('When called with a Wednesday Taipei date', () => {
      // 2026-05-06 = Wed
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-06')).toBe(true);
      });
    });

    describe('When called with a Sunday Taipei date', () => {
      // 2026-05-10 = Sun
      it('Then returns false', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-10')).toBe(false);
      });
    });

    describe('When called with a Monday Taipei date', () => {
      // 2026-05-04 = Mon
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [1, 3, 5] }, '2026-05-04')).toBe(true);
      });
    });
  });

  describe('Given a weekdays routine with a null weekdays array', () => {
    describe('When called', () => {
      it('Then returns false (defensive: schema CHECK should prevent this)', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: null }, '2026-05-06')).toBe(false);
      });
    });
  });

  describe('Given each weekday', () => {
    describe('When weekdays=[0] (Sun) and date is Sun 2026-05-10', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [0] }, '2026-05-10')).toBe(true);
      });
    });

    describe('When weekdays=[6] (Sat) and date is Sat 2026-05-09', () => {
      it('Then returns true', () => {
        expect(appliesOn({ cadenceType: 'weekdays', weekdays: [6] }, '2026-05-09')).toBe(true);
      });
    });
  });
});
