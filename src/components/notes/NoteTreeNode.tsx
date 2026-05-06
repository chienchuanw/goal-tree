import Link from 'next/link';
import type { NoteNode } from '@/domain/notes-tree';
import { CreateNoteDialog } from './CreateNoteDialog';

type Props = {
  node: NoteNode;
  activeId: string | null;
};

export function NoteTreeNode({ node, activeId }: Props) {
  const isActive = node.id === activeId;
  const canHaveChildren = node.depth < 2;

  return (
    <li className="space-y-1">
      <div
        className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${
          isActive ? 'bg-zinc-200 font-medium' : 'hover:bg-zinc-100'
        }`}
      >
        <Link href={`/notes/${node.id}`} className="min-w-0 flex-1 truncate">
          {node.title}
        </Link>
        {canHaveChildren ? (
          <CreateNoteDialog parentId={node.id} buttonLabel="+" />
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l border-zinc-200 pl-2">
          {node.children.map((c) => (
            <NoteTreeNode key={c.id} node={c} activeId={activeId} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
