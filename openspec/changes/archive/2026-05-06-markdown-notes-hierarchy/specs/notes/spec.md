## ADDED Requirements

### Requirement: Notes page renders user's note tree

The system SHALL render `/notes` as an async RSC that calls `listNoteTree(userId)` and displays the user's notes as a recursive tree (max 3 levels). Notes belonging to other users MUST NOT appear.

#### Scenario: Empty state

- **WHEN** an authenticated user with no notes loads `/notes`
- **THEN** the tree is empty and the right pane shows an empty-state CTA prompting the user to create their first note

#### Scenario: User sees only their own notes

- **WHEN** an authenticated user A loads `/notes` and user B has notes
- **THEN** none of user B's notes appear in user A's tree

#### Scenario: Tree is recursive

- **WHEN** the user has a depth-0 note with a depth-1 child that has a depth-2 grandchild
- **THEN** the tree renders all three nested under the root, in that order

### Requirement: Notes are siblings ordered by title

The system SHALL render sibling notes in the tree alphabetically by title (case-insensitive ascending).

#### Scenario: Siblings sorted

- **WHEN** the user has root notes titled "Beta", "alpha", "Gamma"
- **THEN** they render as "alpha", "Beta", "Gamma"

### Requirement: Note creation enforces depth invariant

The system SHALL provide `createNoteAction({ title, parentId, goalId })` that inserts a `notes` row with `depth = parentId === null ? 0 : parent.depth + 1`. The action MUST reject (with a typed error) when the resolved parent's depth is 2, so no row would have `depth > 2`.

#### Scenario: Root note created at depth 0

- **WHEN** the user creates a note with `parentId = null`
- **THEN** the row is inserted with `depth = 0`

#### Scenario: Child note created at depth 1

- **WHEN** the user creates a note under a depth-0 parent
- **THEN** the row is inserted with `depth = 1`

#### Scenario: Grandchild note created at depth 2

- **WHEN** the user creates a note under a depth-1 parent
- **THEN** the row is inserted with `depth = 2`

#### Scenario: Beyond depth 2 is rejected

- **WHEN** the user attempts to create a note under a depth-2 parent
- **THEN** the action returns an error result and no row is inserted

#### Scenario: parentId belonging to another user is rejected

- **WHEN** user B calls `createNoteAction({ parentId: <user A's note id> })`
- **THEN** the action returns an error result ("parent not found") and no row is inserted

### Requirement: "Add child" hidden on depth-2 nodes

The system SHALL hide the "Add child" affordance on tree nodes at depth 2 so the UI mirrors the depth-creation rule.

#### Scenario: Depth-2 node has no add-child button

- **WHEN** a note has `depth = 2` and is rendered in the tree
- **THEN** no "Add child" button appears for that node

#### Scenario: Depth-0 and depth-1 nodes show add-child

- **WHEN** a note has `depth = 0` or `depth = 1`
- **THEN** an "Add child" button appears for that node

### Requirement: Note editor uses CodeMirror 6 in markdown mode

The system SHALL render the note body in a CodeMirror 6 editor configured for markdown. The CodeMirror module MUST be dynamically imported with `ssr: false` so server rendering does not crash on browser-only APIs.

#### Scenario: Editor mounts client-side only

- **WHEN** a user navigates to `/notes/[id]`
- **THEN** the editor placeholder renders during SSR; CodeMirror hydrates after client-side import; no hydration mismatch is logged

#### Scenario: Editor opens with the note's body

- **WHEN** a note has `body_md = "# Heading\n\nText"` and the user opens `/notes/[id]`
- **THEN** the editor displays exactly that text

### Requirement: Edit / Preview toggle

The system SHALL provide a toggle that swaps the right pane between the CodeMirror editor and a rendered markdown preview of the same content.

#### Scenario: Toggling shows the preview

- **WHEN** the user clicks the toggle from "Edit" mode
- **THEN** the right pane renders the markdown preview produced by `<MarkdownPreview source={...} />`

#### Scenario: Toggling back shows the editor

- **WHEN** the user clicks the toggle from "Preview" mode
- **THEN** the right pane renders the CodeMirror editor with the current body

### Requirement: Markdown is sanitized before rendering

The system SHALL pipe rendered markdown through `rehype-sanitize` with the default schema. Raw HTML elements (`<script>`, `<iframe>`, event handlers like `onclick=`, `javascript:` URLs) MUST be stripped before reaching the DOM.

#### Scenario: Script tags stripped

- **WHEN** a note body contains `<script>alert('xss')</script>`
- **THEN** the rendered preview contains no `<script>` element and the alert does not execute

#### Scenario: GFM features preserved

- **WHEN** a note body contains a GFM table, a task list, and a strikethrough
- **THEN** all three render correctly in the preview

#### Scenario: Standard markdown preserved

- **WHEN** a note body contains headings, lists, code blocks, links, and images
- **THEN** all render correctly in the preview

### Requirement: Save on blur and on Cmd/Ctrl+S

The system SHALL persist the editor content via `saveNoteAction(id, title, bodyMd)` when the editor loses focus AND when the user presses `Cmd+S` (macOS) or `Ctrl+S` (other platforms). The system MUST NOT debounce-save while the user is typing.

#### Scenario: Blur triggers save

- **WHEN** the editor has unsaved changes and the user clicks elsewhere
- **THEN** `saveNoteAction` is invoked with the current title and body

#### Scenario: Cmd+S triggers save

- **WHEN** the user presses Cmd+S inside the editor
- **THEN** the browser's default save dialog is suppressed and `saveNoteAction` is invoked

#### Scenario: Typing alone does not save

- **WHEN** the user types into the editor without blurring or pressing Cmd/Ctrl+S
- **THEN** no save occurs

### Requirement: Note rename, delete, and move

The system SHALL provide `renameNoteAction(id, title)`, `deleteNoteAction(id)` (cascading to descendants via the FK constraint), and `moveNoteAction(id, newParentId | null)`. All three MUST be `userId`-scoped and silent no-ops for cross-user calls.

#### Scenario: Rename succeeds for owner

- **WHEN** the owner calls `renameNoteAction(id, 'New title')`
- **THEN** the note's title is updated

#### Scenario: Delete cascades to descendants

- **WHEN** the owner deletes a depth-0 note with depth-1 children and depth-2 grandchildren
- **THEN** all three rows are removed from the database

#### Scenario: Move respects depth invariant

- **WHEN** the owner moves a depth-0 note (with no descendants) under another depth-1 note
- **THEN** the moved note's depth becomes 2

#### Scenario: Move that would push descendants past depth 2 is rejected

- **WHEN** the owner attempts to move a depth-0 note with a depth-2 descendant under another depth-0 note (which would push the descendant to depth 3)
- **THEN** the action returns an error result and no rows are updated

#### Scenario: Cross-user mutation is a silent no-op

- **WHEN** user B calls `renameNoteAction`, `deleteNoteAction`, `saveNoteAction`, or `moveNoteAction` on user A's note
- **THEN** user A's note is unchanged and the action does not error or leak information

### Requirement: Optional goal linking

The system SHALL provide `setNoteGoalAction(id, goalId | null)` that sets or clears the `goal_id` foreign key on a note. The goal MUST belong to the same user; a goal owned by a different user MUST be rejected.

#### Scenario: Link a note to a goal

- **WHEN** the owner calls `setNoteGoalAction(noteId, goalId)` with their own goal
- **THEN** `notes.goal_id` is set to that goal

#### Scenario: Unlink a note from its goal

- **WHEN** the owner calls `setNoteGoalAction(noteId, null)` on a linked note
- **THEN** `notes.goal_id` becomes `null`

#### Scenario: Cross-user goal is rejected

- **WHEN** the owner calls `setNoteGoalAction(noteId, <other user's goal id>)`
- **THEN** the action returns an error result and `notes.goal_id` is unchanged
