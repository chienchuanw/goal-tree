import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getNoteWithBreadcrumb,
  listNoteTree,
  type Note,
} from '@/services/notes';
import { listActiveGoals } from '@/services/goals';
import { assembleTree, type FlatNote, type NoteNode } from '@/domain/notes-tree';
import { NoteTreeSidebar } from '@/components/notes/NoteTreeSidebar';
import { EditorPane } from '@/components/notes/EditorPane';
import { RenameNoteDialog } from '@/components/notes/RenameNoteDialog';
import { DeleteNoteButton } from '@/components/notes/DeleteNoteButton';
import { MoveNoteDialog } from '@/components/notes/MoveNoteDialog';
import { SetNoteGoalControl } from '@/components/notes/SetNoteGoalControl';

export const dynamic = 'force-dynamic';

function flatNoteOf(n: Note): FlatNote {
  return {
    id: n.id,
    parentId: n.parentId,
    title: n.title,
    depth: n.depth,
    goalId: n.goalId,
    updatedAt: n.updatedAt,
  };
}

function maxDepth(node: NoteNode): number {
  let m = node.depth;
  for (const c of node.children) m = Math.max(m, maxDepth(c));
  return m;
}

function buildParentOptions(
  tree: NoteNode[],
  movingId: string,
  movingMaxDepth: number,
  out: Array<{ id: string; title: string; depth: number; disabled: boolean }> = [],
): Array<{ id: string; title: string; depth: number; disabled: boolean }> {
  for (const n of tree) {
    const isSelfOrDescendant = n.id === movingId;
    const wouldOverflow = movingMaxDepth - (n.depth + 1 - 0) > 0; // descendant would exceed 2
    out.push({
      id: n.id,
      title: n.title,
      depth: n.depth,
      disabled: isSelfOrDescendant || (n.depth + 1 + (movingMaxDepth - 0)) > 2,
    });
    if (!isSelfOrDescendant) buildParentOptions(n.children, movingId, movingMaxDepth, out);
  }
  return out;
}

type Params = { params: Promise<{ id: string }> };

export default async function NotePage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const [rows, goals, withCrumb] = await Promise.all([
    listNoteTree(session.user.id),
    listActiveGoals(session.user.id),
    getNoteWithBreadcrumb(id, session.user.id),
  ]);
  if (!withCrumb) notFound();

  const tree = assembleTree(rows.map(flatNoteOf));
  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));

  // Compute parent options for move: precompute moving node's max depth.
  const findInTree = (list: NoteNode[]): NoteNode | null => {
    for (const n of list) {
      if (n.id === id) return n;
      const f = findInTree(n.children);
      if (f) return f;
    }
    return null;
  };
  const movingNode = findInTree(tree);
  const movingMaxDepth = movingNode ? maxDepth(movingNode) : 0;
  const parentOptions = buildParentOptions(tree, id, movingMaxDepth - withCrumb.note.depth);

  return (
    <div className="grid h-full gap-0 md:grid-cols-[280px_1fr]">
      <NoteTreeSidebar tree={tree} activeId={id} />
      <main className="space-y-4 p-6">
        <header className="flex items-center justify-between gap-3">
          <nav className="text-xs text-zinc-500">
            {withCrumb.breadcrumb.map((n, i) => (
              <span key={n.id}>
                {i > 0 ? ' / ' : ''}
                {n.title}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <RenameNoteDialog noteId={id} initialTitle={withCrumb.note.title} />
            <MoveNoteDialog
              noteId={id}
              parentOptions={parentOptions}
              currentParentId={withCrumb.note.parentId}
            />
            <DeleteNoteButton id={id} />
          </div>
        </header>
        <SetNoteGoalControl
          noteId={id}
          currentGoalId={withCrumb.note.goalId}
          goalOptions={goalOptions}
        />
        <EditorPane
          noteId={id}
          initialTitle={withCrumb.note.title}
          initialBody={withCrumb.note.bodyMd}
        />
      </main>
    </div>
  );
}
