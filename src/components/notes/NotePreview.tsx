import { MarkdownPreview } from '@/lib/markdown';

type Props = { bodyMd: string };

export function NotePreview({ bodyMd }: Props) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <MarkdownPreview source={bodyMd} />
    </div>
  );
}
