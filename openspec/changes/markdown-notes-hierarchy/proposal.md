## Why

Studying produces structured notes (chapters, subtopics, references). The app already has goals and routines but no place to actually write. Markdown notes is the third of three MVP features and gives the user somewhere to write structured study material without leaving the app — closing the loop on the "personal study helper" pitch.

The schema (`notes` table with self-FK `parent_id`, depth CHECK 0–2, optional `goal_id`, `(user_id, parent_id)` index) is already in the foundation, so this change is purely the feature surface on top of an existing data layer.

## What Changes

- New `/notes` page: two-pane layout — recursive tree sidebar (left) + editor pane (right).
- New `/notes/[id]` route loads a specific note in the editor.
- Recursive note tree, max 3 levels (depth 0/1/2), enforced by the existing CHECK constraint AND in `createNote` service logic so the constraint never fires in normal flow.
- "Add child" button hidden on depth-2 notes (UI mirrors the schema invariant).
- Editor: CodeMirror 6 in markdown mode, dynamically imported with `ssr: false` (CodeMirror is browser-only).
- Edit/Preview toggle: the right pane swaps between CodeMirror and rendered markdown.
- Markdown renderer: `react-markdown` + `rehype-sanitize` + `remark-gfm`. Raw HTML is stripped.
- Save semantics: save on blur AND on `Cmd/Ctrl+S` only — no debounced auto-save.
- Full CRUD: `createNote`, `saveNote` (title + body), `renameNote`, `deleteNote` (cascade), `setNoteGoal` (optional link).
- Defense-in-depth `userId` scoping in every repo function (precedent from goals + routines).
- Reuses shared `requireUserId` from `src/lib/require-user-id.ts` (extracted in PR #5 simplify).

## Capabilities

### New Capabilities

- `notes`: hierarchical markdown notes (max 3 levels) with CodeMirror 6 editor, sanitized markdown preview, explicit save (blur + Cmd/Ctrl+S), and optional goal linking.

### Modified Capabilities

(none — `goals` and `routines` capabilities are unchanged)

## Impact

- **Affected code**:
  - `app/(app)/notes/page.tsx` — replace placeholder; tree-only view (no note selected) with empty-state CTA
  - `app/(app)/notes/[id]/page.tsx` (new) — async RSC: tree + editor loaded with the active note
  - `src/services/notes.ts` (new) — `listNoteTree`, `getNoteWithBreadcrumb`, `createNote`, `saveNote`, `renameNote`, `deleteNote`, `setNoteGoal` — all explicitly take `userId`
  - `src/services/notes.actions.ts` (new) — `'use server'` wrappers for each mutation
  - `src/domain/notes-tree.ts` (new) — pure-domain `assembleTree(rows)` that takes the flat note rows from the DB and builds a `NoteNode[]` recursive structure
  - `src/lib/zod/notes.ts` (new) — `CreateNoteSchema`, `SaveNoteSchema`, `RenameNoteSchema`, `SetNoteGoalSchema`
  - `src/lib/markdown.ts` (new) — `<MarkdownPreview source={...} />` RSC + render config (remark-gfm, rehype-sanitize)
  - `src/components/notes/` (new) — `NoteTree` (RSC, recursive), `NoteEditor` (client wrapper for CodeMirror), `NotePreview` (RSC), `EditPreviewToggle` (client), `CreateNoteForm`, `CreateNoteDialog`, `RenameNoteForm`, `DeleteNoteButton`, `MoveNoteButton` (deferred or simple), `EditorPane` (client; orchestrates editor/preview state + save callbacks)
- **APIs**: 6 new server actions (`createNoteAction`, `saveNoteAction`, `renameNoteAction`, `deleteNoteAction`, `setNoteGoalAction`, plus `moveNoteAction` if scope permits — TBD in design).
- **New runtime dependencies**:
  - `@uiw/react-codemirror` (React wrapper around CodeMirror 6)
  - `@codemirror/lang-markdown`
  - `react-markdown`
  - `rehype-sanitize`
  - `remark-gfm`
- **Data model**: none — `notes` table already provisioned with all CHECK constraints and indexes.
- **Tests**: new unit tests for `assembleTree` (pure domain), `notes` Zod schemas, and the markdown sanitization pipeline (`<script>` stripped, etc.); new integration tests for the service layer (createNote depth math + rejection at depth=2, saveNote, renameNote, deleteNote cascade, cross-user no-op); RTL smoke test for `EditPreviewToggle` (CodeMirror itself is third-party — no exhaustive interaction test).
