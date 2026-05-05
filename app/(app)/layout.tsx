import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/signin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          <Link href="/today" className="hover:underline">Today</Link>
          <Link href="/goals" className="hover:underline">Goals</Link>
          <Link href="/notes" className="hover:underline">Notes</Link>
        </nav>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/signin' }); }}>
          <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900">
            Sign out ({session.user?.name ?? 'me'})
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
