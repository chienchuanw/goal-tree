# goal-tree — Findings

> Knowledge captured during the foundation + MVP feature 1 build. Future agents (and future-me) should read this before fighting the same gotchas.

## Next 16 breaking changes vs prior versions

The repo is built against Next.js 16. Several conventions changed from prior major versions; the project's `AGENTS.md` warns about this. Always consult `node_modules/next/dist/docs/01-app/` before writing routing, server actions, route handlers, caching, or middleware code.

| Change | Old | New |
|---|---|---|
| Middleware file convention | `middleware.ts` | `proxy.ts` (functionality identical, file at repo root) |
| Client-component prop functions | Any name | Non-serializable function props MUST end in `Action` (or be named `action`) — Next 16 lints this |
| Server actions | Various older patterns | `'use server'` directive at file or function level; canonical examples in `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` |
| `revalidatePath` import | (varied) | `next/cache` |
| `signOut` redirect option | `callbackUrl` (older NextAuth) | `redirectTo` (Auth.js v5) |
| Route-segment `preferredRegion` on Vercel | Region codes like `'iad1'`, `'sin1'` | Only `'auto' \| 'global' \| 'home'`, and only with `runtime = 'edge'`. To pin a Node-runtime serverless function to a specific region, use `vercel.json` `regions` instead. See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/preferredRegion.md`. |

Reference docs in the installed package:
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — server actions
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` — revalidatePath
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — `useActionState`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — proxy file convention

## Library deprecations encountered

| Library | Deprecated form | Use instead |
|---|---|---|
| Zod 4 | `z.string().datetime({ offset: true })` | `z.iso.datetime({ offset: true })` |
| Zod 4 | `z.string().url()` | `z.url()` |
| Vitest 4 | `poolOptions: { forks: { singleFork: true } }` | Top-level `fileParallelism: false` on the project that needs serialization (e.g., integration) |
| Drizzle ORM | `pgTable('name', cols, (t) => ({ key: check(...) }))` (object) | `pgTable('name', cols, (t) => [check(...), index(...)])` (array) |

## CI / pnpm pitfall

`actions/setup-node@v4` invokes `pnpm store path` to determine the cache directory. Without a `packageManager` field in `package.json`, it errors with:

```
ERROR  packages field missing or empty
```

This blocks CI before any test runs and is easy to mistake for a workspace problem.

**Fix (canonical):**

1. Set `"packageManager": "pnpm@<version>"` in `package.json` (use the version that produced `pnpm-lock.yaml`).
2. Drop any explicit `with: version: N` from `pnpm/action-setup@v4` — the action reads from `package.json` automatically.

Result: a single source of truth and no drift between local and CI.

## Local Postgres collision

If the host machine has Postgres listening on `127.0.0.1:5432` (e.g., a Homebrew install, IPv6 socket), Docker's exposed `5432` is silently shadowed on macOS. Symptom: migrations appear to succeed but rows show up in the wrong DB.

**Fix:** in `docker-compose.yml`, bind the container to `127.0.0.1:5433:5432` (or any unused host port) and update `DATABASE_URL` in `.env.local` and `.env.example` to `localhost:5433`. CI is unaffected (GitHub Actions service containers don't have this conflict, so CI keeps `5432`).

## React 19 + Vitest gotcha

Side effects MUST live in `useEffect`, never in the render body. The simplify pass on PR #4 caught a `queueMicrotask(onSuccessAction)` running directly during render — Strict Mode can replay renders without committing, which fired the success callback (closing the dialog) extra times.

```tsx
// WRONG: side effect in render
if (state.status === 'success' && onSuccessAction) {
  queueMicrotask(onSuccessAction);
}

// RIGHT: useEffect
useEffect(() => {
  if (state.status === 'success') onSuccessAction?.();
}, [state.status, onSuccessAction]);
```

If RTL ever throws an "act warning" about IS_REACT_ACT_ENVIRONMENT, add this to `tests/setup/unit.ts`:

```ts
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
```

(Not currently needed in this repo, but documented for the next time it surfaces.)

## shadcn/ui specifics

- Version 2.x is the current line; default style is `base-nova` (successor to `new-york`). The CLI accepts both — pick one and stick with it.
- Tailwind 4 has no JS config file. shadcn writes design tokens (CSS variables) into `app/globals.css`.
- `Dialog` from this repo's shadcn install is `@base-ui/react`, NOT Radix. The trigger uses `<DialogTrigger render={<Button />}>` rather than Radix's `<DialogTrigger asChild>`. If a snippet you're copying uses `asChild`, you must convert it.

## Drizzle + integration test pattern

Repo functions accept a `db: DbOrTx = defaultDb` parameter. Integration tests inject a transaction-bound client via the `withRollback` helper:

```ts
import { withRollback } from '../../helpers/db';

await withRollback(async (tx) => {
  const u = await seedUser(tx);
  const created = await createGoal({ ... }, u.id, tx);
  // ... assertions ...
});
```

`withRollback` runs the body inside a Drizzle transaction and rolls back via a private `RollbackSentinel` exception. The `Tx` and `DbOrTx` types are exported from `src/db/client.ts`.

## Defense-in-depth `userId` scoping

Every repo function takes an explicit `userId` parameter and includes it in the `WHERE` clause. Even though Auth.js + the `proxy.ts` middleware already gate the routes, scoping at the query layer means a future bug or a forgotten `auth()` call cannot leak data.

Idempotency + cross-user safety pattern (used in `archiveGoal`):

```ts
await db
  .update(goals)
  .set({ status: 'archived', archivedAt: sql`now()` })
  .where(
    and(
      eq(goals.id, id),
      eq(goals.userId, userId),
      eq(goals.status, 'active'),
    ),
  );
```

A single UPDATE handles three scenarios in one statement:
- Owner archives an active goal → row updated.
- Owner re-archives an already-archived goal → matches zero rows, no-op.
- Different user calls with the owner's id → matches zero rows, silent no-op.

## Test naming convention (BDD)

Every test file uses:

```ts
describe('<unit name>', () => {
  describe('Given <context>', () => {
    describe('When <action>', () => {
      it('Then <expected outcome>', () => {
        // ...
      });
    });
  });
});
```

This applies uniformly across `tests/unit/`, `tests/integration/`, and `tests/component/`. Tests that don't follow it should be flagged in `simplify` review.

## Workflow tooling notes

- `gh-dev` requires `--name "issues/N"` to enforce branch naming; without it the CLI auto-generates from the issue title.
- `gh-pr` will not push commits with `Co-Authored-By` trailers — repo convention is no signature lines on any commit. Subagents inherit a default that adds them, so the dispatcher MUST inject "no Co-Authored-By" into every subagent prompt.
- `openspec archive <name> -y` does both archive + spec promotion in one step. The `-y` flag bypasses the warning about uncompleted task checkboxes in `openspec/changes/<name>/tasks.md` (which is fine because the work is tracked in the per-feature implementation plan instead).
- The `simplify` skill dispatches three parallel reviewers (reuse / quality / efficiency). High-confidence findings should be applied; low-confidence ones flagged in the PR or this findings doc.

## React 19 + ESLint: `set-state-in-effect`

The `react-hooks/set-state-in-effect` ESLint rule is **strict** in React 19 — calling `setState(...)` directly in a `useEffect` body fails lint, even for the classic "reset state when prop changes" pattern. PR #5 hit this when trying to re-sync `StatusCycleButton`'s optimistic state to a refreshed `initialStatus` prop after `revalidatePath('/today')`.

Allowed alternatives:

1. **Set state during render with prev-prop comparison** (React's official "deriving state from props" idiom):

   ```tsx
   const [optimistic, setOptimistic] = useState(initialStatus);
   const [prevInitial, setPrevInitial] = useState(initialStatus);
   if (prevInitial !== initialStatus) {
     setPrevInitial(initialStatus);
     setOptimistic(initialStatus);
   }
   ```

2. **`useOptimistic`** (React 19) — automatic resync to canonical prop.

3. **Lift the key to the parent** so the component remounts on prop change.

For PR #5 we deferred — happy path doesn't diverge (optimistic state matches what was just sent), so the marginal-value race fix wasn't worth the complexity.

## Next 16 client-prop checklist (writing-plans gotcha)

Every implementation plan that introduces a `'use client'` component MUST pre-validate prop names. Next 16's TS plugin warns:

> Props must be serializable for components in the "use client" entry file. "X" is a function that's not a Server Action. Rename "X" either to "action" or have its name end with "Action".

The rule fires on **EVERY function-typed prop** on a `'use client'` component — not just callbacks that ultimately invoke a server action. Pure render-prop callbacks (`renderEdit: () => ReactNode`) are flagged just the same as `onSuccess: () => void`. Hit three times so far:

- PR #4: `onSuccess→onSuccessAction` (success callback that closed a dialog)
- PR #5: `actionFn→setStatusAction` (callback that wrapped a server action)
- PR #6: `<EditPreviewToggle>` `renderEdit/renderPreview` callbacks → refactored to `editView/previewView` `ReactNode` slots (with `hidden` attribute toggling visibility)

**Two ways to satisfy the rule:**

1. **Rename to `Action` suffix** — only when the prop genuinely invokes a server action. Don't lie with the suffix on a pure callback.
2. **Use `ReactNode` slots instead of function props** — best for render-prop patterns. Both children mount; toggle visibility with `hidden` (or conditional rendering if mount cost is high).

When writing a plan: scan every `type Props = { ... }` block for non-serializable function fields. Either rename to `Action` (if it crosses to a server action) or restructure to take `ReactNode` slots.

## Postgres `now()` vs `clock_timestamp()` interacts with `withRollback`

Postgres' `now()` is `transaction_timestamp()` — constant for the entire transaction. The repo's `tests/helpers/db.ts` `withRollback` runs each integration test inside a single tx (with a `RollbackSentinel` to undo). So inside a test, `now()` returns the same value at the INSERT (column default `defaultNow()`) and at any subsequent UPDATE. Result: tests that compare `before.updatedAt` and `after.updatedAt` fail with `expected X to be greater than X`.

PR #6 hit this when `notes.saveNote` updated `updatedAt: sql\`now()\``. Fix: use `sql\`clock_timestamp()\`` (per-call wall clock) for all `updatedAt` bumps in service mutations. Schema column defaults can keep `defaultNow()` — only manual UPDATE bumps need the change.

```ts
// WRONG inside a withRollback test: never advances
.set({ updatedAt: sql`now()` })

// RIGHT: per-call wall clock
.set({ updatedAt: sql`clock_timestamp()` })
```

Latent in goals + routines services where `now()` is used for `archivedAt` only — those don't compare timestamps in tests today, but if a test ever does, change it the same way.

## Recurring "stale diagnostic" annoyance

## Recurring "stale diagnostic" annoyance

After creating a brand-new module (e.g., `src/lib/zod/goals.ts`), the editor's TS server briefly reports `Cannot find module '@/lib/zod/goals'` even though `pnpm typecheck` passes. Always verify with the actual `tsc --noEmit` before chasing the diagnostic — it's almost always stale.
