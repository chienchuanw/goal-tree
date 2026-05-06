'use client';

import { useState } from 'react';
import { EditPreviewToggle } from './EditPreviewToggle';
import { NoteEditor } from './NoteEditor';
import { NotePreview } from './NotePreview';
import { saveNoteAction } from '@/services/notes.actions';

type Props = {
  noteId: string;
  initialTitle: string;
  initialBody: string;
};

export function EditorPane({ noteId, initialTitle, initialBody }: Props) {
  const [body, setBody] = useState(initialBody);

  return (
    <EditPreviewToggle
      initialMode="edit"
      renderEdit={() => (
        <NoteEditor
          noteId={noteId}
          initialTitle={initialTitle}
          initialBody={body}
          saveAction={async (id, title, bodyMd) => {
            const r = await saveNoteAction(id, title, bodyMd);
            if (r.status === 'ok') setBody(bodyMd);
            return r;
          }}
        />
      )}
      renderPreview={() => <NotePreview bodyMd={body} />}
    />
  );
}
