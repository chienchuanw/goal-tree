import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPreviewToggle } from '@/components/notes/EditPreviewToggle';

afterEach(() => cleanup());

function visiblePane(): 'edit' | 'preview' {
  const edit = screen.getByTestId('edit-pane').closest('[hidden]');
  return edit ? 'preview' : 'edit';
}

describe('EditPreviewToggle', () => {
  describe('Given mode is "edit"', () => {
    describe('When clicked', () => {
      it('Then mode flips to "preview" and the button label updates', async () => {
        const user = userEvent.setup();
        render(
          <EditPreviewToggle
            initialMode="edit"
            editView={<div data-testid="edit-pane">EDIT</div>}
            previewView={<div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(visiblePane()).toBe('edit');
        expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /preview/i }));
        expect(visiblePane()).toBe('preview');
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
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
            editView={<div data-testid="edit-pane">EDIT</div>}
            previewView={<div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(visiblePane()).toBe('preview');
        await user.click(screen.getByRole('button', { name: /edit/i }));
        expect(visiblePane()).toBe('edit');
      });
    });
  });
});
