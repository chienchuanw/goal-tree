import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listNoteTree, resolveBreadcrumb } from '@/services/notes';
import { listActiveGoals } from '@/services/goals';
import {
  assembleTree,
  findInTree,
  flatNoteOf,
  maxDepth,
  type NoteNode,
} from '@/domain/notes-tree';
import { NoteTreeSidebar } from '@/components/notes/NoteTreeSidebar';
import { EditorPane } from '@/components/notes/EditorPane';
import { RenameNoteDialog } from '@/components/notes/RenameNoteDialog';
import { DeleteNoteButton } from '@/components/notes/DeleteNoteButton';
import { MoveNoteDialog } from '@/components/notes/MoveNoteDialog';
import { SetNoteGoalControl } from '@/components/notes/SetNoteGoalControl';

export const dynamic = 'force-dynamic';

type ParentOption = { id: string; title: string; depth: number; disabled: boolean };

/**
 * Walk the tree, listing every node as a candidate parent.
 * `subtreeHeight` is `maxDepth(movedSubtree) - movedNode.depth` — i.e., how many
 * levels of descendants the moved node carries. A candidate is disabled when
 * placing the subtree under it would push the deepest descendant past depth 2.
 */
function buildParentOptions(
  tree: NoteNode[],
  movingId: string,
  subtreeHeight: number,
  out: ParentOption[] = [],
): ParentOption[] {
  for (const n of tree) {
    const isMovingNode = n.id === movingId;
    out.push({
      id: n.id,
      title: n.title,
      depth: n.depth,
      disabled: isMovingNode || n.depth + 1 + subtreeHeight > 2,
    });
    // Recursing into the moved node would list its descendants — also invalid parents.
    if (!isMovingNode) buildParentOptions(n.children, movingId, subtreeHeight, out);
  }
  return out;
}

type Params = { params: Promise<{ id: string }> };

export default async function NotePage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const [rows, goals] = await Promise.all([
    listNoteTree(session.user.id),
    listActiveGoals(session.user.id),
  ]);
  const withCrumb = resolveBreadcrumb(rows, id);
  if (!withCrumb) notFound();

  const tree = assembleTree(rows.map(flatNoteOf));
  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));

  const movingNode = findInTree(tree, id);
  const subtreeHeight = movingNode
    ? maxDepth(movingNode) - withCrumb.note.depth
    : 0;
  const parentOptions = buildParentOptions(tree, id, subtreeHeight);

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
