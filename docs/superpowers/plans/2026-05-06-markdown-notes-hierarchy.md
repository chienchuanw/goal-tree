# Markdown Notes with Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/notes` (gated): two-pane layout with a recursive note tree (max 3 levels) on the left and a CodeMirror 6 markdown editor + Preview toggle on the right. Full CRUD: createNote (depth-respecting), saveNote (blur + Cmd/Ctrl+S, no auto-save), renameNote, deleteNote (cascade), moveNote (depth-recomputing), setNoteGoal (optional link). Markdown rendered through `react-markdown` + `rehype-sanitize` + `remark-gfm`.

**Architecture:** Pure-domain `assembleTree(rows)` in `src/domain/notes-tree.ts` builds the recursive tree from a single flat-rows query. Repo functions in `src/services/notes.ts` accept injected `DbOrTx`; mutations involving parents (createNote, moveNote) load the parent inside a userId-scoped transaction so cross-user `parentId` reads as "not found". Server actions in `src/services/notes.actions.ts` wrap with shared `requireUserId` + `revalidatePath('/notes')`. RSC pages render the tree; only `<NoteEditor>` (CodeMirror) and `<EditPreviewToggle>` are client components. CodeMirror is dynamically imported with `ssr: false` (browser-only).

**Tech Stack:** Next 16 (App Router, RSC + server actions, `revalidatePath`, dynamic imports), React 19 (`useActionState`, `useEffect`-only side effects), Drizzle ORM (postgres-js, `Tx`/`DbOrTx` injection), Auth.js v5, Zod 4 (`z.uuid()`, `z.string().min(1).max(...)`, `.optional().nullable()`), Tailwind 4, shadcn/ui (`@base-ui/react` Dialog uses `<DialogTrigger render={<Button />}>`), Vitest 4 (unit project = happy-dom, integration project = node + `fileParallelism: false`), pnpm.

**New runtime deps installed in Task 1:** `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `react-markdown`, `rehype-sanitize`, `remark-gfm`.

**Reference:**
- openspec proposal: `openspec/changes/markdown-notes-hierarchy/proposal.md`
- openspec design (D1–D11): `openspec/changes/markdown-notes-hierarchy/design.md`
- openspec spec (11 requirements): `openspec/changes/markdown-notes-hierarchy/specs/notes/spec.md`
- openspec tasks (skeleton): `openspec/changes/markdown-notes-hierarchy/tasks.md`
- upstream spec: `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md` §5.3
- precedent (mirror this shape): `docs/superpowers/plans/2026-05-06-routines-and-daily-status.md`, `src/services/routines.ts`, `src/services/routines.actions.ts`, `src/components/routines/CreateRoutineForm.tsx`, `src/components/routines/CreateRoutineDialog.tsx`, `src/lib/zod/routines.ts`
- shared helper: `src/lib/require-user-id.ts` — use this in EVERY action; do NOT inline `auth() + redirect`
- GitHub issue: https://github.com/chienchuanw/goal-tree/issues/3

> ⚠️ **Next 16 caveats:**
> - Server actions: read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `09-revalidating.md` before Task 6.
> - Dynamic imports: read `node_modules/next/dist/docs/01-app/03-api-reference/03-components/dynamic.md` (or current equivalent) before Task 8.3.
> - **Client-prop name rule (D10 of design.md, pre-validated)**: any client-component prop function that ultimately invokes a server action MUST end in `Action`. The plan uses these names verbatim — DO NOT rename them. The list:
>   - `<NoteEditor saveAction={...}>` — invokes `saveNoteAction`
>   - `<NoteEditor onChange={...}>` — pure local-state setter, OK without Action suffix
>   - `<EditPreviewToggle onModeChange={...}>` — pure local-state setter, OK
>   - `<CreateNoteForm onSuccessAction={...}>`, `<CreateNoteDialog onSuccessAction={...}>` — closes dialog after server action success
>   - `<RenameNoteForm onSuccessAction={...}>`, `<RenameNoteDialog onSuccessAction={...}>` — same
>   - `<DeleteNoteButton>` — uses inline `'use server'` form action; no callback prop
>   - `<MoveNoteForm onSuccessAction={...}>`, `<MoveNoteDialog onSuccessAction={...}>` — same
>   - `<SetNoteGoalControl>` — `<form action={...}>` with inline server action; no callback prop

> ⚠️ **shadcn Dialog caveat:** This repo's Dialog comes from `@base-ui/react`, not Radix. `<DialogTrigger>` does NOT support Radix's `asChild`. Use `<DialogTrigger render={<Button />}>` everywhere. Precedent: `src/components/routines/CreateRoutineDialog.tsx`.

> ⚠️ **React 19 caveat:** Side effects (event listeners, server-action calls in response to state changes) MUST live in `useEffect`, never render body. The ESLint rule `react-hooks/set-state-in-effect` rejects `setState` calls inside an effect body — use set-state-during-render with prev-prop comparison or just don't reset (PR #5 chose the latter).

> ⚠️ **RTL setup caveat:** This project's `tests/setup/unit.ts` does NOT auto-cleanup the DOM between tests. Every new RTL test file MUST include `import { afterEach } from 'vitest'; import { cleanup } from '@testing-library/react'; afterEach(() => cleanup());` or `screen.getByRole('button')` will throw "found multiple" once the file has more than one render.

---

## File Structure (created or modified by this plan)

```
src/
  domain/
    notes-tree.ts                                    ← NEW: assembleTree (pure)
  lib/
    markdown.tsx                                     ← NEW: <MarkdownPreview source={...} /> RSC
    zod/
      notes.ts                                       ← NEW: 5 schemas
  services/
    notes.ts                                         ← NEW: 8 repo functions, all userId-scoped
    notes.actions.ts                                 ← NEW: 'use server' wrappers (6 actions)
  components/
    notes/
      NoteTreeNode.tsx                               ← NEW: RSC, recursive tree row
      NoteTreeSidebar.tsx                            ← NEW: RSC, wraps tree + "New root note" CTA
      EditPreviewToggle.tsx                          ← NEW: 'use client', mode swap
      NoteEditor.tsx                                 ← NEW: 'use client', dynamic CodeMirror import + save
      EditorPane.tsx                                 ← NEW: 'use client', orchestrates editor/preview
      NotePreview.tsx                                ← NEW: RSC, wraps <MarkdownPreview>
      CreateNoteForm.tsx                             ← NEW: 'use client', useActionState
      CreateNoteDialog.tsx                           ← NEW: 'use client', wraps CreateNoteForm
      RenameNoteForm.tsx                             ← NEW: 'use client'
      RenameNoteDialog.tsx                           ← NEW: 'use client'
      DeleteNoteButton.tsx                           ← NEW: inline 'use server' form action
      MoveNoteForm.tsx                               ← NEW: 'use client', parent picker
      MoveNoteDialog.tsx                             ← NEW: 'use client'
      SetNoteGoalControl.tsx                         ← NEW: dropdown bound to setNoteGoalAction

app/
  (app)/
    notes/
      page.tsx                                       ← REPLACE placeholder with tree + empty-state
      [id]/
        page.tsx                                     ← NEW: tree + EditorPane

tests/
  unit/
    domain/
      notes-tree.test.ts                             ← NEW
    lib/
      markdown.test.tsx                              ← NEW (RTL + jsdom)
      zod/
        notes.test.ts                                ← NEW
    components/
      notes/
        EditPreviewToggle.test.tsx                   ← NEW (RTL smoke)
  integration/
    services/
      notes.test.ts                                  ← NEW (withRollback + seedUser)
```

**Naming consistency contract** (verified against later tasks before any are written):

- Domain: `assembleTree(rows): NoteNode[]` in `notes-tree.ts`. `NoteNode` type: `{ id, title, depth, goalId, updatedAt, children: NoteNode[] }`.
- Repo functions in `src/services/notes.ts`: `listNoteTree(userId, db?)`, `getNote(id, userId, db?)`, `getNoteWithBreadcrumb(id, userId, db?)`, `createNote(input, userId, db?)`, `saveNote(input, userId, db?)`, `renameNote(input, userId, db?)`, `deleteNote(id, userId, db?)`, `setNoteGoal(input, userId, db?)`, `moveNote(input, userId, db?)`. Every WHERE clause includes `eq(notes.userId, userId)`.
- Server actions in `src/services/notes.actions.ts`: `createNoteAction(prev, formData)`, `saveNoteAction(id, title, bodyMd)`, `renameNoteAction(prev, formData)`, `deleteNoteAction(id)`, `setNoteGoalAction(id, goalId | null)`, `moveNoteAction(prev, formData)`.
- Zod schemas: `CreateNoteSchema`, `SaveNoteSchema`, `RenameNoteSchema`, `SetNoteGoalSchema`, `MoveNoteSchema` (with inferred types `CreateNoteInput`, etc.).
- Components: `<NoteTreeNode>`, `<NoteTreeSidebar>`, `<EditPreviewToggle>`, `<NoteEditor>`, `<EditorPane>`, `<NotePreview>`, `<CreateNoteForm>`, `<CreateNoteDialog>`, `<RenameNoteForm>`, `<RenameNoteDialog>`, `<DeleteNoteButton>`, `<MoveNoteForm>`, `<MoveNoteDialog>`, `<SetNoteGoalControl>`.
- `<MarkdownPreview source={string} />` in `src/lib/markdown.tsx`.
- Action-state union: `CreateNoteActionState = { status: 'idle' } | { status: 'error'; message } | { status: 'success'; id }`. Same shape for rename/move (with `id` payload on success).
- Save-action result: `SaveNoteResult = { status: 'ok' } | { status: 'error'; message }`.

---

## Task 1: Install runtime dependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1.1: Install all 5 deps in one command**

Run: `pnpm add @uiw/react-codemirror @codemirror/lang-markdown react-markdown rehype-sanitize remark-gfm`
Expected: dependencies added; `package.json` updated; lockfile regenerated.

- [ ] **Step 1.2: Verify the workspace still typechecks and builds**

Run: `pnpm typecheck && pnpm build`
Expected: both clean. If typecheck complains about missing types for `react-markdown` or `rehype-sanitize`, install `@types/react-markdown` (the official packages ship types but `@types` may be needed for some sub-packages). Inspect the error output and add types if needed; commit separately if so.

- [ ] **Step 1.3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): add CodeMirror + react-markdown stack for notes feature"
```

---

## Task 2: Domain — `assembleTree` (pure, TDD)

Implements design D1; covers spec scenarios "Tree is recursive", "User sees only their own notes" (the userId filter is in the service; the assembler just shapes the tree), "Siblings sorted".

**Files:**
- Create: `tests/unit/domain/notes-tree.test.ts`
- Create: `src/domain/notes-tree.ts`

- [ ] **Step 2.1: Write the failing unit tests**

Create `tests/unit/domain/notes-tree.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assembleTree, type FlatNote } from '@/domain/notes-tree';

const ts = new Date('2026-05-06T00:00:00Z');

const row = (overrides: Partial<FlatNote>): FlatNote => ({
  id: overrides.id ?? 'id',
  parentId: overrides.parentId ?? null,
  title: overrides.title ?? 'untitled',
  depth: overrides.depth ?? 0,
  goalId: overrides.goalId ?? null,
  updatedAt: overrides.updatedAt ?? ts,
});

describe('assembleTree', () => {
  describe('Given an empty input', () => {
    describe('When called', () => {
      it('Then returns an empty array', () => {
        expect(assembleTree([])).toEqual([]);
      });
    });
  });

  describe('Given a single root note', () => {
    describe('When called', () => {
      it('Then returns one node with no children', () => {
        const tree = assembleTree([row({ id: 'a', title: 'A', depth: 0 })]);
        expect(tree).toHaveLength(1);
        expect(tree[0]!.id).toBe('a');
        expect(tree[0]!.children).toEqual([]);
      });
    });
  });

  describe('Given a depth-2 chain root → child → grandchild', () => {
    describe('When called', () => {
      it('Then returns one root with one child with one grandchild', () => {
        const tree = assembleTree([
          row({ id: 'r', title: 'root', depth: 0 }),
          row({ id: 'c', parentId: 'r', title: 'child', depth: 1 }),
          row({ id: 'g', parentId: 'c', title: 'grand', depth: 2 }),
        ]);
        expect(tree).toHaveLength(1);
        expect(tree[0]!.children).toHaveLength(1);
        expect(tree[0]!.children[0]!.children).toHaveLength(1);
        expect(tree[0]!.children[0]!.children[0]!.id).toBe('g');
      });
    });
  });

  describe('Given multiple roots', () => {
    describe('When called', () => {
      it('Then all appear at the top level', () => {
        const tree = assembleTree([
          row({ id: 'r1', title: 'one', depth: 0 }),
          row({ id: 'r2', title: 'two', depth: 0 }),
        ]);
        expect(tree.map((n) => n.id).sort()).toEqual(['r1', 'r2']);
      });
    });
  });

  describe('Given sibling notes with mixed-case titles', () => {
    describe('When called', () => {
      it('Then siblings are ordered case-insensitively ascending', () => {
        const tree = assembleTree([
          row({ id: 'b', title: 'Beta', depth: 0 }),
          row({ id: 'a', title: 'alpha', depth: 0 }),
          row({ id: 'g', title: 'Gamma', depth: 0 }),
        ]);
        expect(tree.map((n) => n.title)).toEqual(['alpha', 'Beta', 'Gamma']);
      });
    });
  });

  describe('Given a child whose parent is missing from the rows', () => {
    describe('When called', () => {
      it('Then the orphan is dropped (defensive: should not happen in normal flow)', () => {
        const tree = assembleTree([
          row({ id: 'orphan', parentId: 'missing', depth: 1, title: 'orphan' }),
        ]);
        expect(tree).toEqual([]);
      });
    });
  });

  describe('Given children at different depths under the same parent', () => {
    describe('When called', () => {
      it('Then siblings are sorted by title within each parent', () => {
        const tree = assembleTree([
          row({ id: 'r', title: 'root', depth: 0 }),
          row({ id: 'c2', parentId: 'r', title: 'Charlie', depth: 1 }),
          row({ id: 'c1', parentId: 'r', title: 'alpha', depth: 1 }),
        ]);
        expect(tree[0]!.children.map((c) => c.title)).toEqual(['alpha', 'Charlie']);
      });
    });
  });
});
```

- [ ] **Step 2.2: Run — confirm RED**

Run: `pnpm test:unit -- notes-tree`
Expected: FAIL — `Cannot find module '@/domain/notes-tree'`.

- [ ] **Step 2.3: Commit failing tests**

```bash
git add tests/unit/domain/notes-tree.test.ts
git commit -m "test(domain): add failing notes-tree assembleTree tests"
```

- [ ] **Step 2.4: Implement `src/domain/notes-tree.ts`**

```ts
export type FlatNote = {
  id: string;
  parentId: string | null;
  title: string;
  depth: number;
  goalId: string | null;
  updatedAt: Date;
};

export type NoteNode = {
  id: string;
  title: string;
  depth: number;
  goalId: string | null;
  updatedAt: Date;
  children: NoteNode[];
};

function compareTitle(a: NoteNode, b: NoteNode): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function assembleTree(rows: ReadonlyArray<FlatNote>): NoteNode[] {
  const nodesById = new Map<string, NoteNode>();
  for (const r of rows) {
    nodesById.set(r.id, {
      id: r.id,
      title: r.title,
      depth: r.depth,
      goalId: r.goalId,
      updatedAt: r.updatedAt,
      children: [],
    });
  }

  const roots: NoteNode[] = [];
  for (const r of rows) {
    const node = nodesById.get(r.id)!;
    if (r.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodesById.get(r.parentId);
      if (!parent) continue; // orphan — defensive drop
      parent.children.push(node);
    }
  }

  // Sort siblings at every level.
  const sortRecursive = (list: NoteNode[]) => {
    list.sort(compareTitle);
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}
```

- [ ] **Step 2.5: Run — confirm GREEN**

Run: `pnpm test:unit -- notes-tree`
Expected: PASS — 7/7.

- [ ] **Step 2.6: Commit implementation**

```bash
git add src/domain/notes-tree.ts
git commit -m "feat(domain): add assembleTree for hierarchical notes"
```

---

## Task 3: Zod schemas — 5 schemas (TDD)

Implements design D9; covers spec validation parts of "Note creation enforces depth invariant", "Save on blur and on Cmd/Ctrl+S", "Note rename, delete, and move", "Optional goal linking".

**Files:**
- Create: `tests/unit/lib/zod/notes.test.ts`
- Create: `src/lib/zod/notes.ts`

- [ ] **Step 3.1: Write the failing unit tests**

Create `tests/unit/lib/zod/notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CreateNoteSchema,
  SaveNoteSchema,
  RenameNoteSchema,
  SetNoteGoalSchema,
  MoveNoteSchema,
} from '@/lib/zod/notes';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateNoteSchema', () => {
  describe('Given a valid root note input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const parsed = CreateNoteSchema.parse({ title: 'A' });
        expect(parsed.title).toBe('A');
        expect(parsed.parentId).toBeUndefined();
      });
    });
  });

  describe('Given a valid child note input', () => {
    describe('When parsed', () => {
      it('Then accepts parentId and goalId', () => {
        const parsed = CreateNoteSchema.parse({
          title: 'B',
          parentId: uuid,
          goalId: uuid,
        });
        expect(parsed.parentId).toBe(uuid);
        expect(parsed.goalId).toBe(uuid);
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() => CreateNoteSchema.parse({ title: '' })).toThrow();
      });
    });
  });

  describe('Given a non-uuid parentId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateNoteSchema.parse({ title: 'A', parentId: 'not-a-uuid' }),
        ).toThrow();
      });
    });
  });
});

describe('SaveNoteSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const parsed = SaveNoteSchema.parse({
          id: uuid,
          title: 'A',
          bodyMd: '# Hello',
        });
        expect(parsed.bodyMd).toBe('# Hello');
      });
    });
  });

  describe('Given a body over 100KB', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SaveNoteSchema.parse({
            id: uuid,
            title: 'A',
            bodyMd: 'x'.repeat(100_001),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SaveNoteSchema.parse({ id: uuid, title: '', bodyMd: '' }),
        ).toThrow();
      });
    });
  });
});

describe('RenameNoteSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(RenameNoteSchema.parse({ id: uuid, title: 'New' }).title).toBe(
          'New',
        );
      });
    });
  });

  describe('Given a 201-character title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          RenameNoteSchema.parse({ id: uuid, title: 'x'.repeat(201) }),
        ).toThrow();
      });
    });
  });
});

describe('SetNoteGoalSchema', () => {
  describe('Given goalId=null', () => {
    describe('When parsed', () => {
      it('Then accepts it (unlink)', () => {
        expect(SetNoteGoalSchema.parse({ id: uuid, goalId: null }).goalId).toBeNull();
      });
    });
  });

  describe('Given a valid goalId', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(SetNoteGoalSchema.parse({ id: uuid, goalId: uuid }).goalId).toBe(uuid);
      });
    });
  });
});

describe('MoveNoteSchema', () => {
  describe('Given newParentId=null (move to root)', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(MoveNoteSchema.parse({ id: uuid, newParentId: null }).newParentId).toBeNull();
      });
    });
  });

  describe('Given a non-uuid newParentId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          MoveNoteSchema.parse({ id: uuid, newParentId: 'bad' }),
        ).toThrow();
      });
    });
  });
});
```

- [ ] **Step 3.2: Run — confirm RED**

Run: `pnpm test:unit -- notes`
Expected: FAIL — `Cannot find module '@/lib/zod/notes'`.

- [ ] **Step 3.3: Implement `src/lib/zod/notes.ts`**

```ts
import { z } from 'zod';

export const CreateNoteSchema = z.object({
  title: z.string().min(1).max(200),
  parentId: z.uuid().optional().nullable(),
  goalId: z.uuid().optional().nullable(),
});

export const SaveNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  bodyMd: z.string().max(100_000),
});

export const RenameNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
});

export const SetNoteGoalSchema = z.object({
  id: z.uuid(),
  goalId: z.uuid().nullable(),
});

export const MoveNoteSchema = z.object({
  id: z.uuid(),
  newParentId: z.uuid().nullable(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type SaveNoteInput = z.infer<typeof SaveNoteSchema>;
export type RenameNoteInput = z.infer<typeof RenameNoteSchema>;
export type SetNoteGoalInput = z.infer<typeof SetNoteGoalSchema>;
export type MoveNoteInput = z.infer<typeof MoveNoteSchema>;
```

- [ ] **Step 3.4: Run — confirm GREEN**

Run: `pnpm test:unit -- notes`
Expected: PASS — 12/12 (notes-tree's 7 won't run because the filter is "notes" — that's fine; `pnpm test:unit -- notes.test` filters more precisely if you want, or just trust the next full run).

- [ ] **Step 3.5: Commit**

```bash
git add tests/unit/lib/zod/notes.test.ts src/lib/zod/notes.ts
git commit -m "feat(lib/zod): add 5 notes schemas"
```

---

## Task 4: Markdown preview pipeline (TDD)

Implements design D5; covers spec requirement "Markdown is sanitized before rendering".

**Files:**
- Create: `tests/unit/lib/markdown.test.tsx`
- Create: `src/lib/markdown.tsx`

- [ ] **Step 4.1: Write the failing unit test**

Create `tests/unit/lib/markdown.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MarkdownPreview } from '@/lib/markdown';

afterEach(() => cleanup());

describe('MarkdownPreview', () => {
  describe('Given standard markdown (heading + list + code)', () => {
    describe('When rendered', () => {
      it('Then heading and code are present in the DOM', () => {
        const md = '# Title\n\n- one\n- two\n\n```js\nconst a = 1;\n```\n';
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('h1')?.textContent).toBe('Title');
        expect(container.querySelectorAll('li')).toHaveLength(2);
        expect(container.querySelector('code')?.textContent).toContain('const a = 1;');
      });
    });
  });

  describe('Given GFM features (table + task list + strikethrough)', () => {
    describe('When rendered', () => {
      it('Then all three render', () => {
        const md = `| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~strike~~\n`;
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('table')).not.toBeNull();
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
        expect(container.querySelector('del')?.textContent).toBe('strike');
      });
    });
  });

  describe('Given a body containing <script>', () => {
    describe('When rendered', () => {
      it('Then no script element appears in the DOM', () => {
        const md = "Hello\n\n<script>alert('xss')</script>\n";
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('script')).toBeNull();
      });
    });
  });

  describe('Given a body with an <iframe>', () => {
    describe('When rendered', () => {
      it('Then no iframe element appears', () => {
        const md = '<iframe src="https://evil.example.com"></iframe>\n';
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('iframe')).toBeNull();
      });
    });
  });

  describe('Given a link with javascript: URL', () => {
    describe('When rendered', () => {
      it('Then the href is stripped or rewritten', () => {
        const md = "[click](javascript:alert('xss'))\n";
        const { container } = render(<MarkdownPreview source={md} />);
        const a = container.querySelector('a');
        // Either stripped to no href OR rewritten to a safe value
        expect(a?.getAttribute('href')?.startsWith('javascript:') ?? false).toBe(false);
      });
    });
  });

  describe('Given a body with an inline onclick attribute', () => {
    describe('When rendered', () => {
      it('Then the onclick attribute is stripped', () => {
        const md = '<a href="https://example.com" onclick="alert(1)">x</a>\n';
        const { container } = render(<MarkdownPreview source={md} />);
        const a = container.querySelector('a');
        expect(a?.getAttribute('onclick')).toBeNull();
      });
    });
  });
});
```

- [ ] **Step 4.2: Run — confirm RED**

Run: `pnpm test:unit -- markdown`
Expected: FAIL — `Cannot find module '@/lib/markdown'`.

- [ ] **Step 4.3: Implement `src/lib/markdown.tsx`**

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

type Props = {
  source: string;
};

export function MarkdownPreview({ source }: Props) {
  return (
    <div className="prose prose-zinc max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4.4: Run — confirm GREEN**

Run: `pnpm test:unit -- markdown`
Expected: PASS — 6/6.

If `react-markdown` complains about missing types, add `import type {} from 'react-markdown';` at the top, or install `@types/react-markdown` as a dev dep.

If the `<iframe>` or `<script>` test fails because the default sanitize schema permits something unexpected, switch to passing the strict schema explicitly: `import { defaultSchema } from 'rehype-sanitize'; rehypePlugins={[[rehypeSanitize, defaultSchema]]}`. The default schema (no second arg) should already block both — verify with the test output and adjust if needed.

- [ ] **Step 4.5: Commit**

```bash
git add tests/unit/lib/markdown.test.tsx src/lib/markdown.tsx
git commit -m "feat(lib): add MarkdownPreview RSC with sanitize + GFM"
```

---

## Task 5: Service repo — `notes` (TDD against real Postgres)

Implements design D2 + D3 + D7; covers spec requirements "Note creation enforces depth invariant", "Note rename, delete, and move", "Optional goal linking", "Notes page renders user's note tree" (the `listNoteTree` foundation).

**Files:**
- Create: `tests/integration/services/notes.test.ts`
- Create: `src/services/notes.ts`

- [ ] **Step 5.1: Write the failing integration tests**

Create `tests/integration/services/notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { withRollback } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { goals, notes } from '@/db/schema';
import {
  createNote,
  listNoteTree,
  getNote,
  getNoteWithBreadcrumb,
  saveNote,
  renameNote,
  deleteNote,
  setNoteGoal,
  moveNote,
} from '@/services/notes';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('createNote', () => {
  describe('Given parentId=null', () => {
    describe('When createNote is called', () => {
      it('Then inserts at depth 0', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const created = await createNote({ title: 'Root' }, u.id, tx);
          expect(created.depth).toBe(0);
          expect(created.parentId).toBeNull();
          expect(created.userId).toBe(u.id);
        });
      });
    });
  });

  describe('Given a depth-0 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then inserts at depth 1', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'Root' }, u.id, tx);
          const child = await createNote({ title: 'Child', parentId: root.id }, u.id, tx);
          expect(child.depth).toBe(1);
          expect(child.parentId).toBe(root.id);
        });
      });
    });
  });

  describe('Given a depth-1 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then inserts at depth 2', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'R' }, u.id, tx);
          const child = await createNote({ title: 'C', parentId: root.id }, u.id, tx);
          const grand = await createNote({ title: 'G', parentId: child.id }, u.id, tx);
          expect(grand.depth).toBe(2);
        });
      });
    });
  });

  describe('Given a depth-2 parent', () => {
    describe('When createNote is called with that parentId', () => {
      it('Then throws and inserts nothing', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const root = await createNote({ title: 'R' }, u.id, tx);
          const child = await createNote({ title: 'C', parentId: root.id }, u.id, tx);
          const grand = await createNote({ title: 'G', parentId: child.id }, u.id, tx);
          await expect(
            createNote({ title: 'too-deep', parentId: grand.id }, u.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });

  describe('Given parentId belongs to another user', () => {
    describe('When createNote is called', () => {
      it('Then throws "parent not found"', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const aRoot = await createNote({ title: 'A' }, a.id, tx);
          await expect(
            createNote({ title: 'sneaky', parentId: aRoot.id }, b.id, tx),
          ).rejects.toThrow();
        });
      });
    });
  });
});

describe('listNoteTree', () => {
  describe('Given user A has 2 roots and user B has 1', () => {
    describe('When listNoteTree is called for user A', () => {
      it('Then returns only user A rows', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          await createNote({ title: 'A1' }, a.id, tx);
          await createNote({ title: 'A2' }, a.id, tx);
          await createNote({ title: 'B1' }, b.id, tx);
          const rows = await listNoteTree(a.id, tx);
          expect(rows.map((r) => r.title).sort()).toEqual(['A1', 'A2']);
        });
      });
    });
  });
});

describe('getNoteWithBreadcrumb', () => {
  describe('Given a depth-2 note owned by user A', () => {
    describe('When getNoteWithBreadcrumb is called by user A', () => {
      it('Then returns the note + breadcrumb root → child → self', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'Root' }, u.id, tx);
          const c = await createNote({ title: 'Child', parentId: r.id }, u.id, tx);
          const g = await createNote({ title: 'Grand', parentId: c.id }, u.id, tx);
          const result = await getNoteWithBreadcrumb(g.id, u.id, tx);
          expect(result?.note.id).toBe(g.id);
          expect(result?.breadcrumb.map((n) => n.id)).toEqual([r.id, c.id, g.id]);
        });
      });
    });
  });

  describe('Given the note belongs to user A', () => {
    describe('When getNoteWithBreadcrumb is called by user B', () => {
      it('Then returns null', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A note' }, a.id, tx);
          const result = await getNoteWithBreadcrumb(n.id, b.id, tx);
          expect(result).toBeNull();
        });
      });
    });
  });
});

describe('saveNote', () => {
  describe('Given a note owned by user A', () => {
    describe('When saveNote is called by user A', () => {
      it('Then updates body_md and title and bumps updated_at', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'Old' }, u.id, tx);
          const before = n.updatedAt;
          // Sleep 10ms so updated_at can change.
          await new Promise((r) => setTimeout(r, 10));
          await saveNote({ id: n.id, title: 'New', bodyMd: '# Hello' }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('New');
          expect(after.bodyMd).toBe('# Hello');
          expect(after.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
      });
    });
  });

  describe('Given a note owned by user A', () => {
    describe('When saveNote is called by user B', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await saveNote({ id: n.id, title: 'hijack', bodyMd: 'pwn' }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('A');
          expect(after.bodyMd).toBe('');
        });
      });
    });
  });
});

describe('renameNote', () => {
  describe('Given owner renames their note', () => {
    describe('When renameNote is called', () => {
      it('Then title is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'Old' }, u.id, tx);
          await renameNote({ id: n.id, title: 'New' }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('New');
        });
      });
    });
  });

  describe('Given user B tries to rename user A note', () => {
    describe('When renameNote is called', () => {
      it('Then user A title is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await renameNote({ id: n.id, title: 'pwn' }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.title).toBe('A');
        });
      });
    });
  });
});

describe('deleteNote', () => {
  describe('Given a depth-0 note with depth-1 child and depth-2 grandchild', () => {
    describe('When the owner deletes the depth-0 note', () => {
      it('Then all three rows are removed (cascade)', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'R' }, u.id, tx);
          const c = await createNote({ title: 'C', parentId: r.id }, u.id, tx);
          await createNote({ title: 'G', parentId: c.id }, u.id, tx);
          await deleteNote(r.id, u.id, tx);
          const rows = await tx.select().from(notes).where(eq(notes.userId, u.id));
          expect(rows).toEqual([]);
        });
      });
    });
  });

  describe('Given user B tries to delete user A note', () => {
    describe('When deleteNote is called', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await deleteNote(n.id, b.id, tx);
          const rows = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(rows).toHaveLength(1);
        });
      });
    });
  });
});

describe('setNoteGoal', () => {
  describe('Given owner sets their own goal', () => {
    describe('When setNoteGoal is called', () => {
      it('Then notes.goal_id is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const n = await createNote({ title: 'N' }, u.id, tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'G', deadlineAt: future(7) })
            .returning();
          await setNoteGoal({ id: n.id, goalId: g.id }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBe(g.id);
        });
      });
    });
  });

  describe('Given owner unlinks (goalId=null)', () => {
    describe('When setNoteGoal is called', () => {
      it('Then notes.goal_id becomes null', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const [g] = await tx
            .insert(goals)
            .values({ userId: u.id, title: 'G', deadlineAt: future(7) })
            .returning();
          const n = await createNote({ title: 'N', goalId: g.id }, u.id, tx);
          expect(n.goalId).toBe(g.id);
          await setNoteGoal({ id: n.id, goalId: null }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBeNull();
        });
      });
    });
  });

  describe('Given owner tries to link to another user goal', () => {
    describe('When setNoteGoal is called', () => {
      it('Then throws and goal_id is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A note' }, a.id, tx);
          const [bGoal] = await tx
            .insert(goals)
            .values({ userId: b.id, title: 'B', deadlineAt: future(7) })
            .returning();
          await expect(
            setNoteGoal({ id: n.id, goalId: bGoal.id }, a.id, tx),
          ).rejects.toThrow();
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.goalId).toBeNull();
        });
      });
    });
  });
});

describe('moveNote', () => {
  describe('Given a depth-0 leaf moved under a depth-1 parent', () => {
    describe('When moveNote is called', () => {
      it('Then the moved note depth becomes 2', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const r = await createNote({ title: 'R' }, u.id, tx);
          const c = await createNote({ title: 'C', parentId: r.id }, u.id, tx);
          const x = await createNote({ title: 'X' }, u.id, tx);
          await moveNote({ id: x.id, newParentId: c.id }, u.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, x.id));
          expect(after.depth).toBe(2);
          expect(after.parentId).toBe(c.id);
        });
      });
    });
  });

  describe('Given a depth-0 note with a depth-2 descendant', () => {
    describe('When moving it under another depth-0 note (would push descendant to depth 3)', () => {
      it('Then throws and nothing is updated', async () => {
        await withRollback(async (tx) => {
          const u = await seedUser(tx);
          const a = await createNote({ title: 'A' }, u.id, tx);
          const aChild = await createNote({ title: 'AC', parentId: a.id }, u.id, tx);
          await createNote({ title: 'AGrand', parentId: aChild.id }, u.id, tx);
          const b = await createNote({ title: 'B' }, u.id, tx);
          await expect(
            moveNote({ id: a.id, newParentId: b.id }, u.id, tx),
          ).rejects.toThrow();
          const [aAfter] = await tx.select().from(notes).where(eq(notes.id, a.id));
          expect(aAfter.depth).toBe(0);
          expect(aAfter.parentId).toBeNull();
        });
      });
    });
  });

  describe('Given user B tries to move user A note', () => {
    describe('When moveNote is called', () => {
      it('Then user A note is unchanged', async () => {
        await withRollback(async (tx) => {
          const a = await seedUser(tx);
          const b = await seedUser(tx);
          const n = await createNote({ title: 'A' }, a.id, tx);
          await moveNote({ id: n.id, newParentId: null }, b.id, tx);
          const [after] = await tx.select().from(notes).where(eq(notes.id, n.id));
          expect(after.parentId).toBeNull();
          expect(after.userId).toBe(a.id);
        });
      });
    });
  });
});
```

- [ ] **Step 5.2: Run — confirm RED**

Make sure Postgres is up: `docker compose ps` (start with `docker compose up -d db` if not).
Run: `pnpm test:integration -- notes`
Expected: FAIL — `Cannot find module '@/services/notes'`.

- [ ] **Step 5.3: Commit failing tests**

```bash
git add tests/integration/services/notes.test.ts
git commit -m "test(services): add failing notes service tests"
```

- [ ] **Step 5.4: Implement `src/services/notes.ts`**

```ts
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db as defaultDb, type DbOrTx } from '@/db/client';
import { goals, notes, type Note } from '@/db/schema';
import {
  CreateNoteSchema,
  SaveNoteSchema,
  RenameNoteSchema,
  SetNoteGoalSchema,
  MoveNoteSchema,
} from '@/lib/zod/notes';
import { assembleTree, type FlatNote, type NoteNode } from '@/domain/notes-tree';

export async function getNote(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note | null> {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listNoteTree(
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(asc(notes.title));
}

export async function getNoteWithBreadcrumb(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<{ note: Note; breadcrumb: Note[] } | null> {
  const all = await listNoteTree(userId, db);
  const byId = new Map(all.map((n) => [n.id, n]));
  const target = byId.get(id);
  if (!target) return null;

  const breadcrumb: Note[] = [];
  let cursor: Note | undefined = target;
  while (cursor) {
    breadcrumb.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return { note: target, breadcrumb };
}

export async function createNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<Note> {
  const parsed = CreateNoteSchema.parse(input);

  return db.transaction(async (tx) => {
    let depth = 0;
    if (parsed.parentId) {
      const parent = await getNote(parsed.parentId, userId, tx);
      if (!parent) throw new Error('parent not found');
      if (parent.depth >= 2) throw new Error('cannot nest beyond 3 levels');
      depth = parent.depth + 1;
    }

    if (parsed.goalId) {
      const [g] = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (!g) throw new Error('goal not found');
    }

    const [row] = await tx
      .insert(notes)
      .values({
        userId,
        parentId: parsed.parentId ?? null,
        goalId: parsed.goalId ?? null,
        title: parsed.title,
        depth,
      })
      .returning();
    return row;
  });
}

export async function saveNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = SaveNoteSchema.parse(input);
  await db
    .update(notes)
    .set({
      title: parsed.title,
      bodyMd: parsed.bodyMd,
      updatedAt: sql`now()`,
    })
    .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
}

export async function renameNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = RenameNoteSchema.parse(input);
  await db
    .update(notes)
    .set({ title: parsed.title, updatedAt: sql`now()` })
    .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
}

export async function deleteNote(
  id: string,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  // FK ON DELETE CASCADE handles descendants.
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function setNoteGoal(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = SetNoteGoalSchema.parse(input);

  await db.transaction(async (tx) => {
    if (parsed.goalId) {
      const [g] = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (!g) throw new Error('goal not found');
    }
    await tx
      .update(notes)
      .set({ goalId: parsed.goalId, updatedAt: sql`now()` })
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
  });
}

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

function collectIds(node: NoteNode, into: string[] = []): string[] {
  into.push(node.id);
  for (const c of node.children) collectIds(c, into);
  return into;
}

function maxDepth(node: NoteNode): number {
  let m = node.depth;
  for (const c of node.children) m = Math.max(m, maxDepth(c));
  return m;
}

export async function moveNote(
  input: unknown,
  userId: string,
  db: DbOrTx = defaultDb,
): Promise<void> {
  const parsed = MoveNoteSchema.parse(input);

  await db.transaction(async (tx) => {
    const moved = await getNote(parsed.id, userId, tx);
    if (!moved) return; // cross-user no-op

    const oldDepth = moved.depth;
    let newDepth = 0;
    if (parsed.newParentId) {
      const parent = await getNote(parsed.newParentId, userId, tx);
      if (!parent) throw new Error('parent not found');
      newDepth = parent.depth + 1;
    }
    const delta = newDepth - oldDepth;

    if (delta !== 0) {
      // Build the user's tree, find the moved node, check its descendants' max depth.
      const all = await listNoteTree(userId, tx);
      const tree = assembleTree(all.map(flatNoteOf));
      const findInTree = (list: NoteNode[]): NoteNode | null => {
        for (const n of list) {
          if (n.id === parsed.id) return n;
          const inChild = findInTree(n.children);
          if (inChild) return inChild;
        }
        return null;
      };
      const movedNode = findInTree(tree);
      if (!movedNode) return; // Belt-and-suspenders.
      if (maxDepth(movedNode) + delta > 2) {
        throw new Error('move would push descendants beyond 3 levels');
      }

      const affectedIds = collectIds(movedNode);
      await tx
        .update(notes)
        .set({ depth: sql`${notes.depth} + ${delta}` })
        .where(and(eq(notes.userId, userId), inArray(notes.id, affectedIds)));
    }

    await tx
      .update(notes)
      .set({ parentId: parsed.newParentId, updatedAt: sql`now()` })
      .where(and(eq(notes.id, parsed.id), eq(notes.userId, userId)));
  });
}
```

- [ ] **Step 5.5: Run — confirm GREEN**

Run: `pnpm test:integration -- notes`
Expected: PASS — 18/18.

If a test fails, read the actual error before changing anything. Common issues:
- `cadenceType` style cast issues — N/A here, notes don't use enums.
- `inArray` import path — `from 'drizzle-orm'` is correct.
- `sql\`${notes.depth} + ${delta}\`` syntax — verify it produces valid SQL like `"depth" + $1`.

- [ ] **Step 5.6: Commit implementation**

```bash
git add src/services/notes.ts
git commit -m "feat(services): add notes repo (CRUD + move with depth recompute)"
```

---

## Task 6: Server actions — `notes.actions.ts`

Implements design D6 server-action plumbing. Mirrors `routines.actions.ts` shape using shared `requireUserId`.

**Files:**
- Create: `src/services/notes.actions.ts`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `09-revalidating.md` first if you haven't already this session.

- [ ] **Step 6.1: Implement `src/services/notes.actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/require-user-id';
import * as svc from './notes';

export type CreateNoteActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function createNoteAction(
  _prev: CreateNoteActionState,
  formData: FormData,
): Promise<CreateNoteActionState> {
  const userId = await requireUserId();

  const parentIdRaw = String(formData.get('parentId') ?? '').trim();
  const goalIdRaw = String(formData.get('goalId') ?? '').trim();

  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    parentId: parentIdRaw === '' ? null : parentIdRaw,
    goalId: goalIdRaw === '' ? null : goalIdRaw,
  };

  try {
    const created = await svc.createNote(raw, userId);
    revalidatePath('/notes');
    return { status: 'success', id: created.id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not create note',
    };
  }
}

export type SaveNoteResult = { status: 'ok' } | { status: 'error'; message: string };

export async function saveNoteAction(
  id: string,
  title: string,
  bodyMd: string,
): Promise<SaveNoteResult> {
  const userId = await requireUserId();
  try {
    await svc.saveNote({ id, title, bodyMd }, userId);
    revalidatePath('/notes');
    revalidatePath(`/notes/${id}`);
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not save note',
    };
  }
}

export type RenameNoteActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function renameNoteAction(
  _prev: RenameNoteActionState,
  formData: FormData,
): Promise<RenameNoteActionState> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  try {
    await svc.renameNote({ id, title }, userId);
    revalidatePath('/notes');
    revalidatePath(`/notes/${id}`);
    return { status: 'success', id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not rename note',
    };
  }
}

export async function deleteNoteAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await svc.deleteNote(id, userId);
  revalidatePath('/notes');
}

export async function setNoteGoalAction(
  id: string,
  goalId: string | null,
): Promise<SaveNoteResult> {
  const userId = await requireUserId();
  try {
    await svc.setNoteGoal({ id, goalId }, userId);
    revalidatePath(`/notes/${id}`);
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not link goal',
    };
  }
}

export type MoveNoteActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };

export async function moveNoteAction(
  _prev: MoveNoteActionState,
  formData: FormData,
): Promise<MoveNoteActionState> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const newParentRaw = String(formData.get('newParentId') ?? '').trim();
  const newParentId = newParentRaw === '' ? null : newParentRaw;
  try {
    await svc.moveNote({ id, newParentId }, userId);
    revalidatePath('/notes');
    return { status: 'success', id };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Could not move note',
    };
  }
}
```

- [ ] **Step 6.2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 6.3: Commit**

```bash
git add src/services/notes.actions.ts
git commit -m "feat(services): add notes server actions (6 actions)"
```

---

## Task 7: Components — sidebar tree (RSC)

Implements design D8 left-pane composition. Covers spec requirements "Notes page renders user's note tree", "Notes are siblings ordered by title" (already in domain), '"Add child" hidden on depth-2 nodes'.

**Files:**
- Create: `src/components/notes/NoteTreeNode.tsx`
- Create: `src/components/notes/NoteTreeSidebar.tsx`

- [ ] **Step 7.1: Implement `src/components/notes/NoteTreeNode.tsx` (RSC, recursive)**

```tsx
import Link from 'next/link';
import type { NoteNode } from '@/domain/notes-tree';
import { CreateNoteDialog } from './CreateNoteDialog';

type Props = {
  node: NoteNode;
  activeId: string | null;
};

export function NoteTreeNode({ node, activeId }: Props) {
  const isActive = node.id === activeId;
  const canHaveChildren = node.depth < 2;

  return (
    <li className="space-y-1">
      <div
        className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${
          isActive ? 'bg-zinc-200 font-medium' : 'hover:bg-zinc-100'
        }`}
      >
        <Link href={`/notes/${node.id}`} className="min-w-0 flex-1 truncate">
          {node.title}
        </Link>
        {canHaveChildren ? (
          <CreateNoteDialog parentId={node.id} buttonLabel="+" />
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l border-zinc-200 pl-2">
          {node.children.map((c) => (
            <NoteTreeNode key={c.id} node={c} activeId={activeId} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 7.2: Implement `src/components/notes/NoteTreeSidebar.tsx` (RSC)**

```tsx
import type { NoteNode } from '@/domain/notes-tree';
import { NoteTreeNode } from './NoteTreeNode';
import { CreateNoteDialog } from './CreateNoteDialog';

type Props = {
  tree: NoteNode[];
  activeId: string | null;
};

export function NoteTreeSidebar({ tree, activeId }: Props) {
  return (
    <aside className="border-r border-zinc-200 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Notes
        </h2>
        <CreateNoteDialog parentId={null} buttonLabel="New" />
      </header>
      {tree.length === 0 ? (
        <p className="text-sm text-zinc-500">No notes yet.</p>
      ) : (
        <ul className="space-y-1">
          {tree.map((n) => (
            <NoteTreeNode key={n.id} node={n} activeId={activeId} />
          ))}
        </ul>
      )}
    </aside>
  );
}
```

> Don't typecheck/commit yet — `<CreateNoteDialog>` lands in Task 9.

---

## Task 8: Components — editor + preview (the CodeMirror batch)

Implements design D4 + D5 + D6; covers spec requirements "Note editor uses CodeMirror 6 in markdown mode", "Edit / Preview toggle", "Save on blur and on Cmd/Ctrl+S".

**Files:**
- Create: `src/components/notes/EditPreviewToggle.tsx` + RTL test
- Create: `src/components/notes/NoteEditor.tsx`
- Create: `src/components/notes/EditorPane.tsx`
- Create: `src/components/notes/NotePreview.tsx`

- [ ] **Step 8.1: Write the failing RTL smoke test for `<EditPreviewToggle>`**

Create `tests/unit/components/notes/EditPreviewToggle.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPreviewToggle } from '@/components/notes/EditPreviewToggle';

afterEach(() => cleanup());

describe('EditPreviewToggle', () => {
  describe('Given mode is "edit"', () => {
    describe('When clicked', () => {
      it('Then mode flips to "preview" and the button label updates', async () => {
        const user = userEvent.setup();
        render(
          <EditPreviewToggle
            initialMode="edit"
            renderEdit={() => <div data-testid="edit-pane">EDIT</div>}
            renderPreview={() => <div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(screen.getByTestId('edit-pane')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-pane')).toBeNull();
        await user.click(screen.getByRole('button', { name: /preview/i }));
        expect(screen.queryByTestId('edit-pane')).toBeNull();
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
      });
    });
  });

  describe('Given mode is "preview"', () => {
    describe('When clicked', () => {
      it('Then mode flips back to "edit"', async () => {
        const user = userEvent.setup();
        render(
          <EditPreviewToggle
            initialMode="preview"
            renderEdit={() => <div data-testid="edit-pane">EDIT</div>}
            renderPreview={() => <div data-testid="preview-pane">PREVIEW</div>}
          />,
        );
        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /edit/i }));
        expect(screen.getByTestId('edit-pane')).toBeInTheDocument();
      });
    });
  });
});
```

- [ ] **Step 8.2: Run — confirm RED**

Run: `pnpm test:unit -- EditPreviewToggle`
Expected: FAIL — `Cannot find module '@/components/notes/EditPreviewToggle'`.

- [ ] **Step 8.3: Implement `src/components/notes/EditPreviewToggle.tsx` (`'use client'`)**

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Mode = 'edit' | 'preview';

type Props = {
  initialMode?: Mode;
  renderEdit: () => ReactNode;
  renderPreview: () => ReactNode;
};

export function EditPreviewToggle({
  initialMode = 'edit',
  renderEdit,
  renderPreview,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const isEdit = mode === 'edit';
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode(isEdit ? 'preview' : 'edit')}
        >
          {isEdit ? 'Preview' : 'Edit'}
        </Button>
      </div>
      <div>{isEdit ? renderEdit() : renderPreview()}</div>
    </div>
  );
}
```

- [ ] **Step 8.4: Run — confirm GREEN**

Run: `pnpm test:unit -- EditPreviewToggle`
Expected: PASS — 2/2.

- [ ] **Step 8.5: Implement `src/components/notes/NotePreview.tsx` (RSC)**

```tsx
import { MarkdownPreview } from '@/lib/markdown';

type Props = { bodyMd: string };

export function NotePreview({ bodyMd }: Props) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <MarkdownPreview source={bodyMd} />
    </div>
  );
}
```

- [ ] **Step 8.6: Implement `src/components/notes/NoteEditor.tsx` (`'use client'`)**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { markdown } from '@codemirror/lang-markdown';
import type { SaveNoteResult } from '@/services/notes.actions';

const CodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded bg-zinc-100" />,
  },
);

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

type Props = {
  noteId: string;
  initialTitle: string;
  initialBody: string;
  saveAction: (id: string, title: string, bodyMd: string) => Promise<SaveNoteResult>;
};

export function NoteEditor({ noteId, initialTitle, initialBody, saveAction }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const lastSavedRef = useRef({ title: initialTitle, body: initialBody });

  async function save() {
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.body === body
    ) {
      return;
    }
    setStatus('saving');
    const result = await saveAction(noteId, title, body);
    if (result.status === 'ok') {
      lastSavedRef.current = { title, body };
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, noteId]);

  // Reflect dirty state when title/body diverge from last saved.
  useEffect(() => {
    const dirty =
      lastSavedRef.current.title !== title ||
      lastSavedRef.current.body !== body;
    if (dirty && status === 'saved') setStatus('unsaved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void save()}
          maxLength={200}
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-base font-medium"
          placeholder="Title"
        />
        <span
          className={`text-xs ${
            status === 'error'
              ? 'text-red-600'
              : status === 'saved'
              ? 'text-zinc-500'
              : 'text-amber-600'
          }`}
          aria-live="polite"
        >
          {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : status === 'error' ? 'Error' : 'Unsaved'}
        </span>
      </div>
      <div onBlur={() => void save()} className="rounded border border-zinc-300">
        <CodeMirror
          value={body}
          height="60vh"
          extensions={[markdown()]}
          onChange={(value: string) => setBody(value)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 8.7: Implement `src/components/notes/EditorPane.tsx` (`'use client'`)**

```tsx
'use client';

import { useState } from 'react';
import { EditPreviewToggle } from './EditPreviewToggle';
import { NoteEditor } from './NoteEditor';
import { NotePreview } from './NotePreview';
import { saveNoteAction } from '@/services/notes.actions';

type Props = {
  noteId: string;
  initialTitle: string;
  initialBody: string;
};

export function EditorPane({ noteId, initialTitle, initialBody }: Props) {
  const [body, setBody] = useState(initialBody);

  return (
    <EditPreviewToggle
      initialMode="edit"
      renderEdit={() => (
        <NoteEditor
          noteId={noteId}
          initialTitle={initialTitle}
          initialBody={body}
          saveAction={async (id, title, bodyMd) => {
            const r = await saveNoteAction(id, title, bodyMd);
            if (r.status === 'ok') setBody(bodyMd);
            return r;
          }}
        />
      )}
      renderPreview={() => <NotePreview bodyMd={body} />}
    />
  );
}
```

> EditorPane wraps `<NoteEditor>` so the preview can read the latest body. It's necessarily a client component because `<NoteEditor>` already is.

- [ ] **Step 8.8: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean for everything written so far.

- [ ] **Step 8.9: Commit Task 8 (editor batch)**

```bash
git add src/components/notes/EditPreviewToggle.tsx src/components/notes/NoteEditor.tsx src/components/notes/EditorPane.tsx src/components/notes/NotePreview.tsx tests/unit/components/notes/EditPreviewToggle.test.tsx
git commit -m "feat(notes): add EditorPane (CodeMirror editor + preview toggle)"
```

---

## Task 9: Components — CRUD forms

Implements UI side of "Note creation enforces depth invariant", "Note rename, delete, and move", "Optional goal linking".

**Files:**
- Create: `src/components/notes/CreateNoteForm.tsx`
- Create: `src/components/notes/CreateNoteDialog.tsx`
- Create: `src/components/notes/RenameNoteForm.tsx`
- Create: `src/components/notes/RenameNoteDialog.tsx`
- Create: `src/components/notes/DeleteNoteButton.tsx`
- Create: `src/components/notes/MoveNoteForm.tsx`
- Create: `src/components/notes/MoveNoteDialog.tsx`
- Create: `src/components/notes/SetNoteGoalControl.tsx`

- [ ] **Step 9.1: Implement `src/components/notes/CreateNoteForm.tsx`**

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createNoteAction,
  type CreateNoteActionState,
} from '@/services/notes.actions';

const initialState: CreateNoteActionState = { status: 'idle' };

type Props = {
  parentId: string | null;
  goalOptions?: Array<{ id: string; title: string }>;
  onSuccessAction?: () => void;
};

export function CreateNoteForm({ parentId, goalOptions = [], onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(createNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} autoFocus />
      </div>
      {goalOptions.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="goalId">Goal (optional)</Label>
          <select
            id="goalId"
            name="goalId"
            defaultValue=""
            className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">— None —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create note'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 9.2: Implement `src/components/notes/CreateNoteDialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreateNoteForm } from './CreateNoteForm';

type Props = {
  parentId: string | null;
  buttonLabel?: string;
  goalOptions?: Array<{ id: string; title: string }>;
};

export function CreateNoteDialog({ parentId, buttonLabel = 'New note', goalOptions }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{buttonLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parentId ? 'New child note' : 'New root note'}</DialogTitle>
        </DialogHeader>
        <CreateNoteForm
          parentId={parentId}
          goalOptions={goalOptions}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9.3: Implement `src/components/notes/RenameNoteForm.tsx` + Dialog**

`src/components/notes/RenameNoteForm.tsx`:

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  renameNoteAction,
  type RenameNoteActionState,
} from '@/services/notes.actions';

const initialState: RenameNoteActionState = { status: 'idle' };

type Props = {
  noteId: string;
  initialTitle: string;
  onSuccessAction?: () => void;
};

export function RenameNoteForm({ noteId, initialTitle, onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(renameNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={noteId} />
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={initialTitle} autoFocus />
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Renaming…' : 'Rename'}
        </Button>
      </div>
    </form>
  );
}
```

`src/components/notes/RenameNoteDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RenameNoteForm } from './RenameNoteForm';

type Props = { noteId: string; initialTitle: string };

export function RenameNoteDialog({ noteId, initialTitle }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>Rename</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename note</DialogTitle>
        </DialogHeader>
        <RenameNoteForm
          noteId={noteId}
          initialTitle={initialTitle}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9.4: Implement `src/components/notes/DeleteNoteButton.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { deleteNoteAction } from '@/services/notes.actions';

type Props = { id: string };

export function DeleteNoteButton({ id }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        await deleteNoteAction(id);
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Delete
      </Button>
    </form>
  );
}
```

- [ ] **Step 9.5: Implement `src/components/notes/MoveNoteForm.tsx` + Dialog**

`src/components/notes/MoveNoteForm.tsx`:

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  moveNoteAction,
  type MoveNoteActionState,
} from '@/services/notes.actions';

const initialState: MoveNoteActionState = { status: 'idle' };

type ParentOption = { id: string; title: string; depth: number; disabled: boolean };

type Props = {
  noteId: string;
  parentOptions: ParentOption[];
  currentParentId: string | null;
  onSuccessAction?: () => void;
};

export function MoveNoteForm({ noteId, parentOptions, currentParentId, onSuccessAction }: Props) {
  const [state, formAction, pending] = useActionState(moveNoteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') onSuccessAction?.();
  }, [state.status, onSuccessAction]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={noteId} />
      <div className="space-y-1">
        <Label htmlFor="newParentId">Move under</Label>
        <select
          id="newParentId"
          name="newParentId"
          defaultValue={currentParentId ?? ''}
          className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
        >
          <option value="">— Root —</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id} disabled={p.disabled}>
              {'  '.repeat(p.depth)}
              {p.title}
              {p.disabled ? ' (would exceed depth)' : ''}
            </option>
          ))}
        </select>
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Moving…' : 'Move'}
        </Button>
      </div>
    </form>
  );
}
```

`src/components/notes/MoveNoteDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoveNoteForm } from './MoveNoteForm';

type ParentOption = { id: string; title: string; depth: number; disabled: boolean };

type Props = {
  noteId: string;
  parentOptions: ParentOption[];
  currentParentId: string | null;
};

export function MoveNoteDialog({ noteId, parentOptions, currentParentId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>Move</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move note</DialogTitle>
        </DialogHeader>
        <MoveNoteForm
          noteId={noteId}
          parentOptions={parentOptions}
          currentParentId={currentParentId}
          onSuccessAction={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9.6: Implement `src/components/notes/SetNoteGoalControl.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { setNoteGoalAction } from '@/services/notes.actions';

type Props = {
  noteId: string;
  currentGoalId: string | null;
  goalOptions: Array<{ id: string; title: string }>;
};

export function SetNoteGoalControl({ noteId, currentGoalId, goalOptions }: Props) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : e.target.value;
    startTransition(async () => {
      await setNoteGoalAction(noteId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="goalId" className="text-xs text-zinc-500">Linked goal</Label>
      <select
        id="goalId"
        defaultValue={currentGoalId ?? ''}
        onChange={onChange}
        disabled={pending}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        <option value="">— None —</option>
        {goalOptions.map((g) => (
          <option key={g.id} value={g.id}>{g.title}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 9.7: Verify typecheck for everything that's been added so far**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 9.8: Commit Task 9**

```bash
git add src/components/notes/CreateNoteForm.tsx src/components/notes/CreateNoteDialog.tsx src/components/notes/RenameNoteForm.tsx src/components/notes/RenameNoteDialog.tsx src/components/notes/DeleteNoteButton.tsx src/components/notes/MoveNoteForm.tsx src/components/notes/MoveNoteDialog.tsx src/components/notes/SetNoteGoalControl.tsx
git commit -m "feat(notes): add Create/Rename/Delete/Move/SetGoal forms + dialogs"
```

---

## Task 10: Pages — `/notes` and `/notes/[id]`

Implements design D8.

**Files:**
- Replace: `app/(app)/notes/page.tsx`
- Create: `app/(app)/notes/[id]/page.tsx`

- [ ] **Step 10.1: Replace `app/(app)/notes/page.tsx`**

```tsx
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
```

- [ ] **Step 10.2: Create `app/(app)/notes/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 10.3: Verify lint, typecheck, build**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: every command exits 0. `next build` reports `/notes` and `/notes/[id]` as dynamic routes.

- [ ] **Step 10.4: Commit pages + sidebar (Task 7 + Task 10 together — Task 7 was deferred since it imports CreateNoteDialog)**

```bash
git add src/components/notes/NoteTreeNode.tsx src/components/notes/NoteTreeSidebar.tsx app/\(app\)/notes/page.tsx app/\(app\)/notes/\[id\]/page.tsx
git commit -m "feat(notes): add /notes RSC pages + tree sidebar"
```

---

## Task 11: Acceptance walk-through + final verification

- [ ] **Step 11.1: Make sure local Postgres is up**

Run: `docker compose ps`
Expected: `goal-tree-db` is `(healthy)` on `127.0.0.1:5433->5432`.

- [ ] **Step 11.2: Run the full check suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Expected: every command exits 0. Unit suite shows new `notes-tree` (7), `notes zod` (12), `markdown` (6), `EditPreviewToggle` (2) tests passing alongside existing. Integration suite shows new `notes` (18) tests passing alongside existing.

- [ ] **Step 11.3: Manual UI walk (requires real GitHub OAuth + valid `.env.local`)**

Run: `pnpm dev`. In a browser:

1. Sign in. Visit `/notes` → empty state with "New" button in sidebar.
2. Click "New" → dialog. Submit `{title: 'Chapter 1'}`. → Tree shows "Chapter 1".
3. Click "Chapter 1" → navigates to `/notes/[id]`. Editor pane appears with empty body.
4. Type some markdown (`# Title\n\nContent`). Click outside the editor → status flips to "Saving…" then "Saved".
5. Refresh `/notes/[id]` → body persisted.
6. Click "Preview" → markdown renders. Click "Edit" → CodeMirror back.
7. Type more text. Press Cmd+S (or Ctrl+S) → save fires; browser default Save dialog NOT shown.
8. Hover the "Chapter 1" row in the sidebar → "+" button visible. Click it → child-note dialog. Submit `{title: '1.1 Topic'}` → tree shows "1.1 Topic" nested.
9. Hover the "1.1 Topic" row → "+" still visible. Click → submit `{title: '1.1.1 Detail'}` → tree shows depth-2 node.
10. Hover the "1.1.1 Detail" row → NO "+" button (depth-2 invariant).
11. Click Move on "1.1.1 Detail" → dialog with parent picker. Pick "Root" → action runs. Tree updates, "1.1.1 Detail" now at depth 0.
12. Try to move "Chapter 1" (which has descendants) under "1.1 Topic" — the option should be disabled in the picker.
13. Use SetNoteGoalControl → pick a goal. Reload → the dropdown remembers.
14. Click Delete on a leaf → it disappears. Click Delete on "Chapter 1" (depth-0 with descendants) → it AND all descendants disappear (cascade).
15. Sign out → `/notes` redirects to `/signin`.

- [ ] **Step 11.4: Final status**

```bash
git log --oneline dev..HEAD
git status
```

Confirm: each task's commits land in expected order, working tree clean.

- [ ] **Step 11.5: Open the PR via `gh-pr` skill**

Plan complete here — the user invokes `gh-pr` separately.

---

## Self-Review Notes (done before this file was saved)

**Spec coverage**

| Spec requirement | Task(s) |
|---|---|
| Notes page renders user's note tree (RSC, userId-scoped, recursive) | 5 (`listNoteTree` filter), 7 (`NoteTreeSidebar`), 10 (page) |
| Notes are siblings ordered by title (case-insensitive) | 2 (`compareTitle`) |
| Note creation enforces depth invariant (createNote depth math + reject at 2 + cross-user parent reject) | 5 (createNote tests + impl), 6 (action), 9 (CreateNoteForm + Dialog) |
| "Add child" hidden on depth-2 nodes | 7 (`NoteTreeNode` `canHaveChildren = node.depth < 2`) |
| Note editor uses CodeMirror 6 in markdown mode (dynamic ssr:false) | 8 (`NoteEditor`) |
| Edit / Preview toggle | 8 (`EditPreviewToggle` + RTL test) |
| Markdown is sanitized before rendering (script/iframe/onclick/javascript: stripped, GFM preserved) | 4 (`MarkdownPreview` + 6 tests) |
| Save on blur and on Cmd/Ctrl+S; typing alone does not save | 8 (`NoteEditor` save logic + dirty tracking) |
| Note rename, delete (cascade), move (depth-recompute, descendant-overflow rejection, cross-user no-op) | 5 (impl + tests), 6 (actions), 9 (dialogs + DeleteNoteButton) |
| Optional goal linking (set, unlink, cross-user goal rejected) | 5 (`setNoteGoal` impl + tests), 6 (action), 9 (`SetNoteGoalControl`) |

**Placeholder scan:** none — every code step has complete code, no "TODO/TBD/similar to/etc.".

**Type/name consistency:**

- Repo functions: `listNoteTree`, `getNote`, `getNoteWithBreadcrumb`, `createNote`, `saveNote`, `renameNote`, `deleteNote`, `setNoteGoal`, `moveNote` (Task 5, used by Tasks 6 + 10).
- Server actions: `createNoteAction`, `saveNoteAction`, `renameNoteAction`, `deleteNoteAction`, `setNoteGoalAction`, `moveNoteAction` (Task 6, consumed by Tasks 9 + 10 + EditorPane).
- Domain: `assembleTree`, `FlatNote`, `NoteNode` (Task 2, consumed by Tasks 5 + 7 + 10).
- Save-action result type: `SaveNoteResult = { status: 'ok' } | { status: 'error'; message }` shared by `saveNoteAction` and `setNoteGoalAction` (Task 6, consumed by Task 8 `<NoteEditor saveAction>`).
- Action-state unions: `CreateNoteActionState`, `RenameNoteActionState`, `MoveNoteActionState` (Task 6, consumed by Task 9 forms).
- Client-prop names per design D10 — verified verbatim:
  - `<NoteEditor saveAction={...}>` ✓
  - `<EditPreviewToggle>` no callback prop crosses to a server action — uses local `useState`
  - `<CreateNoteForm onSuccessAction={...}>`, `<CreateNoteDialog>` (the dialog passes `onSuccessAction` through implicitly via wrap) ✓
  - `<RenameNoteForm onSuccessAction={...}>`, `<RenameNoteDialog>` ✓
  - `<MoveNoteForm onSuccessAction={...}>`, `<MoveNoteDialog>` ✓
  - `<DeleteNoteButton>` uses inline `'use server'` form action — no callback prop
  - `<SetNoteGoalControl>` calls `setNoteGoalAction` directly inside `useTransition`'s callback — no callback prop

**Known intermediate breakage:**

- Task 7 (`NoteTreeNode`/`NoteTreeSidebar`) is committed together with Task 10 (pages) at the end of Task 10 because `NoteTreeNode` imports `<CreateNoteDialog>` from Task 9. Tasks 7→10 form a coherent batch — the plan says "Don't typecheck/commit yet" at the end of Task 7 and combines the commit at Step 10.4. Task 8 (editor) and Task 9 (forms) commit independently because they don't import Task 7's components.
- Task 6 (actions) commits independently — its imports (Task 5 services + Task 3 zod) are already on disk.
- The Task 4 markdown sanitization tests use `react-markdown` server components rendered via RTL in happy-dom. If happy-dom can't render Server Components, fall back to `import { renderToString } from 'react-dom/server'` and assert against the HTML string — but try the RTL render first; modern `react-markdown` works in JSX-without-RSC mode.
