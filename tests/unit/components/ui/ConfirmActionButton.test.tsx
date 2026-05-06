import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmActionButton } from '@/components/ui/ConfirmActionButton';

describe('ConfirmActionButton', () => {
  afterEach(() => cleanup());

  describe('Given default props', () => {
    describe('When the trigger is rendered', () => {
      it('Then it has the provided accessible label and visible label', () => {
        const action = vi.fn(async () => {});
        render(
          <ConfirmActionButton
            action={action}
            triggerLabel="Archive"
            triggerAriaLabel="Archive routine"
            title="Archive this routine?"
            description="You can restore it anytime from /archive."
            confirmLabel="Archive"
          />,
        );
        const trigger = screen.getByRole('button', { name: /archive routine/i });
        expect(trigger).toHaveTextContent('Archive');
      });
    });
  });

  describe('Given the trigger is clicked', () => {
    describe('When the dialog opens', () => {
      it('Then it shows the title and description', async () => {
        const user = userEvent.setup();
        const action = vi.fn(async () => {});
        render(
          <ConfirmActionButton
            action={action}
            triggerLabel="Archive"
            triggerAriaLabel="Archive routine"
            title="Archive this routine?"
            description="You can restore it anytime from /archive."
            confirmLabel="Archive"
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button', { name: /archive routine/i }));
        });
        expect(screen.getByText('Archive this routine?')).toBeInTheDocument();
        expect(
          screen.getByText('You can restore it anytime from /archive.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Given the dialog is open', () => {
    describe('When Cancel is clicked', () => {
      it('Then the action is not called and the dialog closes', async () => {
        const user = userEvent.setup();
        const action = vi.fn(async () => {});
        render(
          <ConfirmActionButton
            action={action}
            triggerLabel="Archive"
            triggerAriaLabel="Archive routine"
            title="Archive this routine?"
            description="desc"
            confirmLabel="Archive"
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button', { name: /archive routine/i }));
        });
        await act(async () => {
          await user.click(screen.getByRole('button', { name: /cancel/i }));
        });
        expect(action).not.toHaveBeenCalled();
        expect(screen.queryByText('Archive this routine?')).not.toBeInTheDocument();
      });
    });

    describe('When Confirm is clicked', () => {
      it('Then action is invoked exactly once and dialog closes', async () => {
        const user = userEvent.setup();
        const action = vi.fn(async () => {});
        render(
          <ConfirmActionButton
            action={action}
            triggerLabel="Archive"
            triggerAriaLabel="Archive routine"
            title="Archive this routine?"
            description="desc"
            confirmLabel="Archive"
          />,
        );
        await act(async () => {
          await user.click(screen.getByRole('button', { name: /archive routine/i }));
        });
        // Two buttons share name 'Archive': trigger (still in tree, hidden) and confirm.
        // Click the LAST matched one (the dialog confirm).
        const archiveButtons = screen.getAllByRole('button', { name: 'Archive' });
        await act(async () => {
          await user.click(archiveButtons[archiveButtons.length - 1]);
        });
        expect(action).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Archive this routine?')).not.toBeInTheDocument();
      });
    });
  });
});
