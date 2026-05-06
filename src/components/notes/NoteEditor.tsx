'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { markdown } from '@codemirror/lang-markdown';
import type { SaveNoteResult } from '@/services/notes.actions';

const CodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded bg-zinc-100" />,
  },
);

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

type Props = {
  noteId: string;
  initialTitle: string;
  initialBody: string;
  saveAction: (id: string, title: string, bodyMd: string) => Promise<SaveNoteResult>;
};

export function NoteEditor({ noteId, initialTitle, initialBody, saveAction }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const lastSavedRef = useRef({ title: initialTitle, body: initialBody });

  async function save() {
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.body === body
    ) {
      return;
    }
    setStatus('saving');
    const result = await saveAction(noteId, title, body);
    if (result.status === 'ok') {
      lastSavedRef.current = { title, body };
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }

  // Keep a fresh `save` reference for the long-lived keydown listener.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  function markUnsaved(nextTitle: string, nextBody: string) {
    const dirty =
      lastSavedRef.current.title !== nextTitle ||
      lastSavedRef.current.body !== nextBody;
    if (dirty) setStatus((s) => (s === 'saved' ? 'unsaved' : s));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            const next = e.target.value;
            setTitle(next);
            markUnsaved(next, body);
          }}
          onBlur={() => void save()}
          maxLength={200}
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-base font-medium"
          placeholder="Title"
        />
        <span
          className={`text-xs ${
            status === 'error'
              ? 'text-red-600'
              : status === 'saved'
              ? 'text-zinc-500'
              : 'text-amber-600'
          }`}
          aria-live="polite"
        >
          {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : status === 'error' ? 'Error' : 'Unsaved'}
        </span>
      </div>
      <div onBlur={() => void save()} className="rounded border border-zinc-300">
        <CodeMirror
          value={body}
          height="60vh"
          extensions={[markdown()]}
          onChange={(value: string) => {
            setBody(value);
            markUnsaved(title, value);
          }}
        />
      </div>
    </div>
  );
}
