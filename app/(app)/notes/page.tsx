export const dynamic = 'force-dynamic';

export default function NotesPage() {
  return (
    <section className="space-y-10 md:space-y-14">
      <header className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">03 · Notes</p>
          <p className="num text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Coming soon
          </p>
        </div>
        <h1 className="display text-5xl md:text-7xl">
          What you<br className="hidden md:block" /> want to keep.
        </h1>
        <div className="rule" />
      </header>

      <div className="border border-rule p-8 md:p-12">
        <p className="eyebrow mb-3">In progress</p>
        <p className="text-ink-soft text-base md:text-lg max-w-md leading-relaxed">
          Notes will live here — short, dated, searchable. The kind of thing
          worth re-reading in a month.
        </p>
      </div>
    </section>
  );
}
