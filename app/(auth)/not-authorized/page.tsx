import Link from 'next/link';

export default function NotAuthorizedPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6 bg-background text-foreground">
      <div className="w-full max-w-md">
        <p className="eyebrow mb-6 text-signal">403 · Restricted</p>
        <h1 className="display text-5xl md:text-6xl mb-4">Not&nbsp;authorized.</h1>
        <p className="text-ink-soft text-[15px] leading-relaxed mb-10">
          This deploy is single-tenant and reserved for the owner. If that&apos;s
          you, sign in with the registered GitHub account.
        </p>
        <Link
          href="/signin"
          className="inline-flex items-center justify-between gap-6 border border-ink px-4 py-3 text-sm tracking-tight transition-colors hover:bg-ink hover:text-paper"
        >
          <span>Back to sign in</span>
          <span aria-hidden className="num text-[10px] tracking-[0.2em]">→</span>
        </Link>
      </div>
    </main>
  );
}
