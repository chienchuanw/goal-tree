## Context

Foundation provides the `notes` table with `parent_id` self-FK (`onDelete: 'cascade'`), `goal_id` FK (`onDelete: 'set null'`), `depth smallint NOT NULL`, CHECK constraint `depth BETWEEN 0 AND 2`, and a `(user_id, parent_id)` index. Auth.js + `proxy.ts` gate `app/(app)/**`. The goals + routines features (PRs #4 + #5) set the conventions: pure domain in `src/domain/`, services orchestrate db + domain, `<feature>.actions.ts` for `'use server'` wrappers, components in `src/components/<feature>/`, defense-in-depth `userId` scoping in every WHERE clause, BDD-style describe/it nesting, `db: DbOrTx = defaultDb` injection. Shared `requireUserId` lives at `src/lib/require-user-id.ts`.

Single user, GitHub-OAuth gated. No timezone math here (notes are timezone-agnostic; `created_at`/`updated_at` are UTC `timestamptz`).

## Goals / Non-Goals

**Goals:**

- Two-pane `/notes` layout — left tree (≤3 levels), right editor.
- CodeMirror 6 in markdown mode, dynamically imported (no SSR — CodeMirror is browser-only).
- Edit/Preview toggle on the right pane.
- Save semantics: explicit only — on blur and on `Cmd/Ctrl+S`. No debounced typing-time save.
- Markdown rendered via `react-markdown` + `rehype-sanitize` + `remark-gfm`. Raw HTML stripped.
- Optional goal link per note (existing `goal_id` FK).
- Full CRUD with depth-respecting create/move and cascade delete.
- All client-component non-serializable function props end in `Action` (Next 16 client-prop rule — pre-validated here so the plan doesn't repeat the PR#4/#5 mid-execution rename fix).

**Non-Goals:**

- Note search / full-text search — out of MVP.
- Backlinks / wiki-style `[[link]]` syntax — out of MVP.
- Tags — out of MVP.
- File / image attachments — out of MVP.
- Auto-save while typing (debounced or otherwise) — explicitly excluded.
- Drag-and-drop reordering in the tree — out of MVP (a `moveNoteAction` may exist but the UI for it is a "Move…" button with a parent picker, not drag-drop).
- Inline math (KaTeX/LaTeX) — out of MVP.
- Storing rendered HTML in the DB — store raw markdown, render at read-time.

## Decisions

### D1: Tree is rendered server-side from a single query

`listNoteTree(userId)` runs ONE `SELECT * FROM notes WHERE user_id = $1 ORDER BY parent_id NULLS FIRST, title ASC` and the pure-domain `assembleTree(rows)` builds the `NoteNode[]` recursive structure in JS. With max depth 2 and a single-user app, the row count stays small (low hundreds at most) — no need for a recursive CTE.

**Rationale:** One query, one in-memory pass, zero N+1 risk. `assembleTree` is unit-testable without a DB.

**Alternatives:** (a) Recursive CTE — overkill for the row count and harder to test; (b) per-level lazy load — pointless when the entire tree fits in one query.

### D2: Depth is computed in `createNote`, not trusted from the client

`createNote(input, userId)` accepts `parentId: string | null`. Depth is computed:
- `parentId === null` → `depth = 0` (root)
- otherwise → `depth = parent.depth + 1`, loaded via `getNote(parentId, userId)` inside the same transaction

If `parent.depth === 2`, the action throws (`Error('cannot nest beyond 3 levels')`). The schema CHECK is the last-line defence; the service is the user-facing one.

**Rationale:** Two layers of enforcement (service + CHECK). Cross-user `parentId` (parent owned by a different user) reads as "not found" inside the user-scoped `getNote` call → throws "parent not found", same as a non-existent UUID. Defense-in-depth pattern from goals/routines.

**Alternatives:** (a) Trust client-supplied depth — rejected, insecure; (b) compute depth via a generated column in Postgres — more clever but harder to express in Drizzle and less testable.

### D3: `moveNoteAction` is in scope; depth recomputation is in scope

`moveNoteAction(id, newParentId | null)` reparents a note. New depth = `newParentId === null ? 0 : parent.depth + 1`. If moving the note would push any descendant past depth 2, the action throws. To check this:
- compute `oldDepth` of the moved note and `newDepth`
- compute `delta = newDepth - oldDepth`
- if `delta === 0`, allow (no-op for depths)
- if `delta > 0`, fetch the deepest descendant; reject if `descendant.depth + delta > 2`
- write all affected rows' new depth in one UPDATE: `UPDATE notes SET depth = depth + $delta WHERE user_id = $userId AND id = $movedId OR <descendant predicate>`

For MVP simplicity, the descendant predicate is a recursive walk in JS using the same flat-rows approach as `listNoteTree`, then a single `WHERE id IN (...)` UPDATE. Only one transaction, one read pass (we already have `listNoteTree`-shaped data), one write.

**Rationale:** Move is the most complex op; getting it wrong corrupts the depth invariant. Computing in JS keeps it testable.

**Alternative:** Skip move in MVP. Rejected — being able to reorganize is core to the "structural notes" UX.

### D4: Save semantics — blur + Cmd/Ctrl+S, no auto-save

The `<NoteEditor>` (client component) wires:
- `onBlur` on the CodeMirror instance → calls `saveNoteAction(id, body, title)` if the body or title changed since the last successful save
- `keydown` handler for `Cmd+S` / `Ctrl+S` (preventDefault) → same call
- A small "Saved" / "Saving…" / "Unsaved" indicator next to the title

NO `useEffect`-based debounced save. Typing alone never persists.

**Rationale:** Explicit save matches "study notes" mental model (the user controls when state is committed). Avoids the auto-save / undo / conflict complexity that would balloon scope. Keeps tests deterministic.

**Alternatives:** (a) Debounced auto-save — rejected for MVP; (b) explicit "Save" button only — rejected, blur+keyboard is the standard for an editor surface.

### D5: Markdown rendering — `react-markdown` + `rehype-sanitize` + `remark-gfm`

`<MarkdownPreview source={md} />` lives in `src/lib/markdown.ts` as an RSC. It uses:
- `react-markdown` as the renderer
- `remark-gfm` for tables, task lists, strikethrough, autolinks
- `rehype-sanitize` with the default schema (strips `<script>`, event handlers, `javascript:` URLs)

`rehype-sanitize` runs by default — there is no escape hatch for "trusted HTML" in MVP.

**Rationale:** `react-markdown` is the de-facto React markdown stack. `rehype-sanitize` is its standard sanitization companion. `remark-gfm` matches user expectations from GitHub markdown.

**Alternatives:** (a) `marked` + `DOMPurify` — works but yields raw HTML in JSX; less idiomatic in React. (b) `markdown-it` — fast but the React integration is less smooth.

### D6: CodeMirror dynamic import with `ssr: false`

`<NoteEditor>` is a `'use client'` component. Inside it, the CodeMirror import is dynamic:

```tsx
'use client';
import dynamic from 'next/dynamic';

const CodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-zinc-100" /> },
);
```

Wrapped in a separate `<NoteEditor>` so the dynamic import happens only once per page load, not per re-render.

**Rationale:** CodeMirror touches `window` and DOM APIs at module-evaluation time; SSR throws. Dynamic + `ssr: false` is the documented Next 16 pattern.

**Alternatives:** Server-side render a `<textarea>` placeholder, hydrate to CodeMirror — more complex, no benefit when CodeMirror loads in <100ms.

### D7: Defense-in-depth `userId` scoping

Every repo function in `src/services/notes.ts` takes an explicit `userId: string` parameter and includes `eq(notes.userId, userId)` in WHERE. Cross-user calls (caller passes a `noteId` they don't own) match zero rows — no error, no leak. Same pattern as `archiveGoal` and `setRoutineStatus`.

For mutations involving parents (createNote with `parentId`, moveNote with `newParentId`), the parent lookup itself is `userId`-scoped — a parent owned by a different user reads as "not found" and the action throws "parent not found".

### D8: Routes and page composition

- `app/(app)/notes/page.tsx` — async RSC; `auth()` + `listNoteTree()`; renders `<NoteTreeSidebar>` + an empty-state right pane ("Select a note or create your first one"). `export const dynamic = 'force-dynamic'`.
- `app/(app)/notes/[id]/page.tsx` — async RSC; `auth()` + `listNoteTree()` + `getNoteWithBreadcrumb(id, userId)`; renders `<NoteTreeSidebar>` + `<EditorPane note={...} />`. If the note doesn't exist (or belongs to a different user), `notFound()`.
- `app/(app)/page.tsx` — already redirects authenticated users to `/today` (set during routines feature). Not changed by this feature.

Two-pane layout uses CSS grid: `grid-cols-[280px_1fr]` on `md:` and up; below md, the tree collapses behind a "Notes" button (basic responsive behavior, MVP-good-enough).

### D9: Zod schemas in `src/lib/zod/notes.ts`

```ts
export const CreateNoteSchema = z.object({
  title: z.string().min(1).max(200),
  parentId: z.uuid().optional().nullable(),
  goalId: z.uuid().optional().nullable(),
});

export const SaveNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  bodyMd: z.string().max(100_000), // 100KB cap per note
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
```

100KB body cap is a sanity bound — can be raised later. Title max 200 matches goals/routines.

### D10: Next 16 client-prop names — pre-validated

This was a bug source in PRs #4 (`onSuccess`→`onSuccessAction`) and #5 (`actionFn`→`setStatusAction`). Pre-validating here:

| Component | Non-serializable function props | Plan-time name |
|---|---|---|
| `<NoteEditor>` | save callback, body-change callback | `saveAction`, `onChange` is OK if it's a `(value: string) => void` updating local state only — but if it crosses to a server action, name `setBodyAction` |
| `<EditPreviewToggle>` | mode-change callback | `onModeChange` is OK ONLY if it's a pure local state setter; if it triggers server work, `setModeAction` |
| `<CreateNoteForm>` / `<CreateNoteDialog>` | success callback | `onSuccessAction` (matches goals/routines precedent) |
| `<RenameNoteForm>` | success callback | `onSuccessAction` |
| `<DeleteNoteButton>` | confirm action | inline `'use server'` form action OR `deleteAction` |
| `<MoveNoteButton>` | parent selection callback | `onMoveAction` if it triggers the server action; `onPickParent` if pure local |

Rule of thumb encoded in the plan: any client-component prop function that ultimately invokes a server action MUST end in `Action`. Pure local state setters can keep `on*` naming.

### D11: Tests

- **Unit (`tests/unit/`)**:
  - `domain/notes-tree.test.ts` — `assembleTree` for empty input, single root, depth-2 chain, multiple roots, mixed; ordering by title within siblings.
  - `lib/markdown.test.tsx` — `<MarkdownPreview>` renders headings, code blocks, GFM tables/task-lists, autolinks; `<script>`/`<iframe>`/`onclick=` are stripped.
  - `lib/zod/notes.test.ts` — all 5 schemas, valid + invalid cases.
  - `components/notes/EditPreviewToggle.test.tsx` — RTL: clicking toggles mode; the right child renders in each mode (smoke test, not exhaustive).

- **Integration (`tests/integration/services/`)**:
  - `notes.test.ts` —
    - `createNote` at root (depth 0), at depth 1, at depth 2; rejection on depth 2 parent
    - `createNote` rejection when `parentId` belongs to a different user (reads as "parent not found")
    - `listNoteTree` returns user's notes shaped as a tree, excludes other users
    - `getNoteWithBreadcrumb` returns null when note belongs to another user; returns root → ... → self when owned
    - `saveNote` updates `body_md` + `title`, bumps `updated_at`; cross-user no-op
    - `renameNote` updates title only; cross-user no-op
    - `deleteNote` cascades children; cross-user no-op
    - `setNoteGoal` sets and clears `goal_id`; rejects when goal belongs to a different user (reads as "goal not found")
    - `moveNote` reparents to root, reparents to a depth-1 parent (resulting depth respected); rejects when move would push any descendant past depth 2; cross-user no-op
- All wrapped in `withRollback` with `seedUser` fixtures.

## Risks / Trade-offs

- **[Risk] Bundle size from CodeMirror.** → CodeMirror 6 + markdown lang ≈ 100KB gzipped. Acceptable for a notes editor; dynamic import keeps it off the initial page load.
- **[Risk] `react-markdown` SSR bundle bloat.** → Renders server-side; the client doesn't ship the markdown pipeline. Trade-off: every note view re-renders on the server (mitigated by RSC + `force-dynamic`).
- **[Risk] Hydration mismatch if CodeMirror is statically imported.** → Mitigated by `dynamic(..., { ssr: false })` per D6.
- **[Risk] `moveNote` corrupts depth if the descendant walk is wrong.** → Mitigated by reusing `listNoteTree`'s flat-rows + walk (same code path covered by tree-assembly tests). The CHECK constraint catches any escape.
- **[Risk] Save-on-blur swallows errors silently if the network drops.** → Surface via the "Saving…" / "Unsaved" indicator. If the action returns error, indicator turns red and the body stays dirty until the next blur/Cmd+S.
- **[Risk] Sanitizer overzealous, breaking valid markdown features.** → `rehype-sanitize` default schema permits all standard markdown elements (headings, lists, tables, links, images, code). Only HTML-injection vectors are stripped. Documented in `findings.md`.
- **[Trade-off] No drag-and-drop reorder.** → Users can use Move + parent picker. Acceptable for MVP.
- **[Trade-off] Save-on-blur loses edits if the user closes the tab without blurring.** → Acceptable for MVP given the explicit-save UX. We can warn on `beforeunload` in a follow-up.

## Migration Plan

No data migration. New routes, new components, no schema changes. Default landing page stays `/today` (set during routines feature).

Rollback: revert the PR. Schema unchanged.

## Open Questions

- Should `setNoteGoal` be a separate action, or folded into `saveNoteAction` with an optional `goalId` field? — Folding is simpler from the client; keeping separate matches the goals/routines pattern of one action per logical mutation. Recommendation: separate action, `setNoteGoalAction(id, goalId | null)`.
- Should the tree show an "Untitled" placeholder when title is empty? — `title` is `NOT NULL` and Zod requires `min(1)`, so empty title isn't possible. Skip.
- Should there be a "Recent notes" section? — Out of MVP. Tree only.
