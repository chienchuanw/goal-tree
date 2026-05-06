import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HoursCountdown } from '@/components/goals/HoursCountdown';

describe('HoursCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T04:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given a deadline 4h 23m in the future', () => {
    describe('When mounted', () => {
      it('Then exposes "4 hours 23 minutes remaining" via aria-label', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(
          screen.getByLabelText('4 hours 23 minutes remaining'),
        ).toBeInTheDocument();
      });
    });

    describe('When 60 seconds elapse', () => {
      it('Then exposes "4 hours 22 minutes remaining" via aria-label', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        act(() => {
          vi.advanceTimersByTime(60_000);
        });
        expect(
          screen.getByLabelText('4 hours 22 minutes remaining'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Given a deadline 2 days in the past', () => {
    describe('When mounted', () => {
      it('Then exposes "Overdue 2 days" via aria-label', () => {
        const deadline = new Date('2026-05-03T04:00:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(screen.getByLabelText('Overdue 2 days')).toBeInTheDocument();
      });
    });
  });
});
