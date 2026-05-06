# Tasks

## 1. Dependencies

- [ ] 1.1 Add runtime deps: `pnpm add @uiw/react-codemirror @codemirror/lang-markdown react-markdown rehype-sanitize remark-gfm`
- [ ] 1.2 Verify `pnpm typecheck` and `pnpm build` still pass with the new deps installed

## 2. Domain: tree assembly

- [ ] 2.1 Write failing unit tests for `assembleTree(rows)` at `tests/unit/domain/notes-tree.test.ts` (empty, single root, depth-2 chain, multiple roots, sibling ordering by title)
- [ ] 2.2 Implement `src/domain/notes-tree.ts` with `NoteNode` type and `assembleTree(rows: Pick<Note, 'id'|'parentId'|'title'|'depth'|'goalId'|'updatedAt'>[]): NoteNode[]`
- [ ] 2.3 Run unit tests and confirm green

## 3. Zod schemas

- [ ] 3.1 Write failing unit tests for `CreateNoteSchema`, `SaveNoteSchema`, `RenameNoteSchema`, `SetNoteGoalSchema`, `MoveNoteSchema` at `tests/unit/lib/zod/notes.test.ts`
- [ ] 3.2 Implement `src/lib/zod/notes.ts` with all 5 schemas using Zod 4 idioms (`z.uuid()`, `z.string().min(1).max(...)`, `.optional().nullable()`)
- [ ] 3.3 Run unit tests and confirm green

## 4. Markdown preview pipeline

- [ ] 4.1 Write failing unit tests at `tests/unit/lib/markdown.test.tsx` covering: heading/list/code rendering, GFM table/task-list/strikethrough, `<script>` stripped, `<iframe>` stripped, `onclick=` attribute stripped, `javascript:` URL stripped
- [ ] 4.2 Implement `src/lib/markdown.tsx` exporting `<MarkdownPreview source={string} />` (RSC) using `react-markdown` + `remark-gfm` + `rehype-sanitize`
- [ ] 4.3 Run unit tests and confirm green

## 5. Service: notes repo

- [ ] 5.1 Write failing integration tests at `tests/integration/services/notes.test.ts` for: `createNote` (root/d1/d2), depth-2 parent rejection, cross-user parent rejection, `listNoteTree` (own only), `getNoteWithBreadcrumb` (returns ancestry, cross-user returns null)
- [ ] 5.2 Write failing integration tests for `saveNote` (updates body+title, bumps updated_at, cross-user no-op), `renameNote` (cross-user no-op), `deleteNote` (cascade), `setNoteGoal` (set, clear, cross-user-goal rejection)
- [ ] 5.3 Write failing integration tests for `moveNote` (reparent succeeds, depth recomputed, descendant-pushed-past-depth-2 rejected, cross-user no-op)
- [ ] 5.4 Implement `src/services/notes.ts` with `createNote`, `listNoteTree`, `getNoteWithBreadcrumb`, `saveNote`, `renameNote`, `deleteNote`, `setNoteGoal`, `moveNote` — all take explicit `userId` and scope WHERE clauses on it
- [ ] 5.5 Run integration tests and confirm green

## 6. Server actions

- [ ] 6.1 Implement `src/services/notes.actions.ts` with `'use server'` directive: `createNoteAction`, `saveNoteAction`, `renameNoteAction`, `deleteNoteAction`, `setNoteGoalAction`, `moveNoteAction`. Each calls `requireUserId()` from `src/lib/require-user-id.ts` and `revalidatePath('/notes')` (and `/notes/[id]` where appropriate)
- [ ] 6.2 Add typecheck to confirm `'use server'` exports are serializable

## 7. Components — tree + sidebar

- [ ] 7.1 Implement `src/components/notes/NoteTreeNode.tsx` (RSC, recursive): renders title, "Add child" button (hidden if depth=2), "Rename" / "Delete" / "Move" controls
- [ ] 7.2 Implement `src/components/notes/NoteTreeSidebar.tsx` (RSC): wraps the recursive tree with empty-state handling and a top-level "New root note" button + dialog

## 8. Components — editor + preview

- [ ] 8.1 Write a failing RTL smoke test for `EditPreviewToggle` at `tests/unit/components/notes/EditPreviewToggle.test.tsx`: clicking toggles a `mode` state; right child renders in each mode
- [ ] 8.2 Implement `src/components/notes/EditPreviewToggle.tsx` (`'use client'`) with `useState` for mode and a single button that swaps Edit ↔ Preview
- [ ] 8.3 Implement `src/components/notes/NoteEditor.tsx` (`'use client'`): dynamic import of `@uiw/react-codemirror` with `ssr: false`; props include `initialBody`, `initialTitle`, `noteId`, `saveAction` (the server action)
  - Handles save-on-blur and Cmd/Ctrl+S keydown (preventDefault)
  - Tracks `dirty` state; "Saving…" / "Saved" / "Unsaved" indicator
  - Uses `useEffect` for keydown listener registration/cleanup (NOT render body)
- [ ] 8.4 Implement `src/components/notes/EditorPane.tsx` (`'use client'`): orchestrates `<EditPreviewToggle>` + `<NoteEditor>` + `<NotePreview>`, holds the current body in state
- [ ] 8.5 Implement `src/components/notes/NotePreview.tsx` (RSC): wraps `<MarkdownPreview source={bodyMd} />` with note-specific layout

## 9. Components — CRUD forms

- [ ] 9.1 Implement `src/components/notes/CreateNoteForm.tsx` (`'use client'`): `useActionState` with `createNoteAction`, hidden `parentId`, optional `goalId` dropdown, `useEffect` for success callback (NOT render body), prop named `onSuccessAction`
- [ ] 9.2 Implement `src/components/notes/CreateNoteDialog.tsx` (`'use client'`): wraps `<CreateNoteForm>` in shadcn Dialog with `<DialogTrigger render={<Button />}>` (NOT `asChild`)
- [ ] 9.3 Implement `src/components/notes/RenameNoteForm.tsx` + `RenameNoteDialog.tsx` (mirroring CreateNote)
- [ ] 9.4 Implement `src/components/notes/DeleteNoteButton.tsx`: confirm + `deleteNoteAction` via inline `'use server'` form action
- [ ] 9.5 Implement `src/components/notes/MoveNoteDialog.tsx`: parent picker (the user's tree, with depth-1+ entries disabled where moving would create a depth-3 node), submit calls `moveNoteAction`
- [ ] 9.6 Implement `src/components/notes/SetNoteGoalControl.tsx`: dropdown bound to `setNoteGoalAction`

## 10. Pages

- [ ] 10.1 Replace `app/(app)/notes/page.tsx` with async RSC: `auth()` + `listNoteTree(session.user.id)` → renders `<NoteTreeSidebar>` + empty-state right pane + `<CreateNoteDialog>`
- [ ] 10.2 Create `app/(app)/notes/[id]/page.tsx` async RSC: `auth()` + `listNoteTree()` + `getNoteWithBreadcrumb(id, session.user.id)`; if not found, `notFound()`; else render `<NoteTreeSidebar>` + `<EditorPane note={...} />`
- [ ] 10.3 Manual smoke check: lint clean, typecheck clean, dev server renders `/notes` and `/notes/[id]` without hydration errors

## 11. Final checks

- [ ] 11.1 Run `pnpm lint` — clean
- [ ] 11.2 Run `pnpm typecheck` — clean
- [ ] 11.3 Run `pnpm test:unit` — all green
- [ ] 11.4 Run `pnpm test:integration` — all green
- [ ] 11.5 Run `pnpm build` — clean (verify `/notes` and `/notes/[id]` listed as dynamic routes)
- [ ] 11.6 `openspec validate markdown-notes-hierarchy --strict` — passes
