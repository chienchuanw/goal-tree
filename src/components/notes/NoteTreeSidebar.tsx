import type { NoteNode } from '@/domain/notes-tree';
import { NoteTreeNode } from './NoteTreeNode';
import { CreateNoteDialog } from './CreateNoteDialog';

type Props = {
  tree: NoteNode[];
  activeId: string | null;
};

export function NoteTreeSidebar({ tree, activeId }: Props) {
  return (
    <aside className="border-r border-zinc-200 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Notes
        </h2>
        <CreateNoteDialog parentId={null} buttonLabel="New" />
      </header>
      {tree.length === 0 ? (
        <p className="text-sm text-zinc-500">No notes yet.</p>
      ) : (
        <ul className="space-y-1">
          {tree.map((n) => (
            <NoteTreeNode key={n.id} node={n} activeId={activeId} />
          ))}
        </ul>
      )}
    </aside>
  );
}
