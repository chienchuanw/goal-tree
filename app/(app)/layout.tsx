import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { NavTabsDesktop, NavTabsMobile } from '@/components/app/NavTabs';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/signin');

  const user = session.user?.name ?? session.user?.email ?? 'me';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 md:h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-10">
          <Link href="/today" className="group inline-flex items-baseline gap-2">
            <span className="display text-[15px] md:text-base">Goal&nbsp;Tree</span>
            <span className="num hidden md:inline text-[10px] tracking-[0.18em] text-ink-faint">
              ©{new Date().getFullYear()}
            </span>
          </Link>

          <NavTabsDesktop />

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/signin' });
            }}
            className="flex items-center gap-3"
          >
            <span
              className="hidden md:inline num text-[10px] tracking-[0.18em] uppercase text-ink-faint truncate max-w-[160px]"
              title={user}
            >
              {user}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 border border-rule px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Sign&nbsp;out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 md:px-10 pb-28 md:pb-16 pt-6 md:pt-12">
          {children}
        </div>
      </main>

      <NavTabsMobile />
    </div>
  );
}
