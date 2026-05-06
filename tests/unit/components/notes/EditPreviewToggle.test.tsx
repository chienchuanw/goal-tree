import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPreviewToggle } from '@/components/notes/EditPreviewToggle';

afterEach(() => cleanup());

describe('EditPreviewToggle', () => {
  describe('Given mode is "edit"', () => {
    describe('When clicked', () => {
      it('Then mode flips to "preview" and the button label updates', async () => {
        const user = userEvent.setup();
        render(
          <EditPreviewToggle
            initialMode="edit"
            renderEdit={() => <div data-testid="edit-pane">EDIT</div>}
            renderPreview={() => <div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(screen.getByTestId('edit-pane')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-pane')).toBeNull();
        await user.click(screen.getByRole('button', { name: /preview/i }));
        expect(screen.queryByTestId('edit-pane')).toBeNull();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
      });
    });
  });

  describe('Given mode is "preview"', () => {
    describe('When clicked', () => {
      it('Then mode flips back to "edit"', async () => {
        const user = userEvent.setup();
        render(
          <EditPreviewToggle
            initialMode="preview"
            renderEdit={() => <div data-testid="edit-pane">EDIT</div>}
            renderPreview={() => <div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /edit/i }));
        expect(screen.getByTestId('edit-pane')).toBeInTheDocument();
      });
    });
  });
});
