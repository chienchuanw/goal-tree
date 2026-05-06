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
      it('Then renders "4h 23m"', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(screen.getByText('4h 23m')).toBeInTheDocument();
      });
    });

    describe('When 60 seconds elapse', () => {
      it('Then renders "4h 22m"', () => {
        const deadline = new Date('2026-05-05T08:23:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        act(() => {
          vi.advanceTimersByTime(60_000);
        });
        expect(screen.getByText('4h 22m')).toBeInTheDocument();
      });
    });
  });

  describe('Given a deadline 2 days in the past', () => {
    describe('When mounted', () => {
      it('Then renders "Overdue 2d"', () => {
        const deadline = new Date('2026-05-03T04:00:00Z').toISOString();
        render(<HoursCountdown deadlineAt={deadline} />);
        expect(screen.getByText('Overdue 2d')).toBeInTheDocument();
      });
    });
  });
});
