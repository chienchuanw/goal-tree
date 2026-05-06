import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listNoteTree } from '@/services/notes';
import { assembleTree, flatNoteOf } from '@/domain/notes-tree';
import { NoteTreeSidebar } from '@/components/notes/NoteTreeSidebar';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const rows = await listNoteTree(session.user.id);
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
