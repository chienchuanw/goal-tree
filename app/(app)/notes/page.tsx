import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listNoteTree, type Note } from '@/services/notes';
import { listActiveGoals } from '@/services/goals';
import { assembleTree, type FlatNote } from '@/domain/notes-tree';
import { NoteTreeSidebar } from '@/components/notes/NoteTreeSidebar';

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

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const [rows, _goals] = await Promise.all([
    listNoteTree(session.user.id),
    listActiveGoals(session.user.id),
  ]);
  const tree = assembleTree(rows.map(flatNoteOf));

  return (
    <div className="grid h-full gap-0 md:grid-cols-[280px_1fr]">
      <NoteTreeSidebar tree={tree} activeId={null} />
      <main className="p-6">
        <p className="text-sm text-zinc-500">Select a note from the tree, or create your first one.</p>
      </main>
    </div>
  );
}
