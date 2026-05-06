import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusCycleButton } from '@/components/routines/StatusCycleButton';

const action = vi.fn(async () => ({ status: 'ok' as const }));

describe('StatusCycleButton', () => {
  beforeEach(() => {
    action.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Given current status is null (unset)', () => {
    describe('When clicked once', () => {
      it('Then calls action with status=done and reflects "done"', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus={null}
            setStatusAction={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'done');
        expect(screen.getByRole('button')).toHaveTextContent(/done/i);
      });
    });
  });

  describe('Given current status is done', () => {
    describe('When clicked', () => {
      it('Then calls action with status=partial', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="done"
            setStatusAction={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'partial');
      });
    });
  });

  describe('Given current status is partial', () => {
    describe('When clicked', () => {
      it('Then calls action with status=skipped', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="partial"
            setStatusAction={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', 'skipped');
      });
    });
  });

  describe('Given current status is skipped', () => {
    describe('When clicked', () => {
      it('Then calls action with status=null (clears the log)', async () => {
        const user = userEvent.setup();
        render(
          <StatusCycleButton
            routineId="r1"
            date="2026-05-06"
            initialStatus="skipped"
            setStatusAction={action}
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button'));
        });
        expect(action).toHaveBeenCalledWith('r1', '2026-05-06', null);
      });
    });
  });
});
