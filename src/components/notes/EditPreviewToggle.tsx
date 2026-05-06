'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Mode = 'edit' | 'preview';

type Props = {
  initialMode?: Mode;
  renderEdit: () => ReactNode;
  renderPreview: () => ReactNode;
};

export function EditPreviewToggle({
  initialMode = 'edit',
  renderEdit,
  renderPreview,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const isEdit = mode === 'edit';
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode(isEdit ? 'preview' : 'edit')}
        >
          {isEdit ? 'Preview' : 'Edit'}
        </Button>
      </div>
      <div>{isEdit ? renderEdit() : renderPreview()}</div>
    </div>
  );
}
