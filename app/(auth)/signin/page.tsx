import { signIn } from '@/lib/auth';

export default function SignInPage() {
  return (
    <main className="min-h-screen grid grid-rows-[1fr_auto] bg-background text-foreground">
      <div className="grid place-items-center px-6">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-6">001 · Authenticate</p>
          <h1 className="display text-5xl md:text-6xl mb-3">Goal Tree.</h1>
          <p className="text-ink-soft text-[15px] md:text-base leading-relaxed mb-10 max-w-sm">
            A quiet ledger for the few things that matter — goals with a deadline,
            routines that earn the day, notes for what survives.
          </p>

          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: '/today' });
            }}
            className="space-y-3"
          >
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-between border border-ink bg-ink px-4 py-3.5 text-sm tracking-tight text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              <span>Continue with GitHub</span>
              <span aria-hidden className="num text-[10px] tracking-[0.2em]">→</span>
            </button>
            <p className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint pt-1">
              Single-tenant · owner only
            </p>
          </form>
        </div>
      </div>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-md px-6 py-4 flex items-center justify-between">
          <span className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            v0.1 · Asia/Taipei
          </span>
          <span className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            ©{new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </main>
  );
}
