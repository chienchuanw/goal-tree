## Context

The foundation already provides:

- `goals` table in `src/db/schema/goals.ts` with `id`, `user_id`, `title`, `description`, `deadline_at` (`timestamptz`), `status` (CHECK in `'active' | 'completed' | 'archived'`, default `'active'`), `created_at`, `archived_at`. Indexed on `(user_id, status)`.
- `src/db/client.ts` exports a single Drizzle client (`db`) using the `postgres-js` driver.
- `src/lib/auth.ts` exports `auth()` (returns the current session), `signIn`, `signOut`, `handlers`. Session shape extended with `user.id` (`users.id`) and `user.githubId`.
- `src/domain/taipei.ts` exports `TAIPEI_TZ`, `todayInTaipei(now?)`, `weekdayInTaipei(now?)`, `isWithinBackfillWindow(date, now?)`. Pure, no I/O.
- `src/lib/env.ts` exposes a Zod-validated `env()`.
- `tests/helpers/db.ts` exposes `withRollback` for transactional integration tests; `tests/helpers/fixtures.ts` exposes `seedUser`.
- `proxy.ts` (Next 16's renamed middleware) gates everything outside `/signin`, `/not-authorized`, `/api/auth`. The `app/(app)/layout.tsx` also re-checks the session and redirects to `/signin` when missing.
- shadcn primitives installed: `Button`, `Card`, `Input`, `Label`. Tailwind 4 + `cn` helper at `src/lib/utils.ts`.
- Vitest projects: `unit` (happy-dom) and `integration` (node, `fileParallelism: false`). `pnpm test:unit`, `pnpm test:integration`.

Stack: Next 16 (App Router, RSC + server actions), React 19, TypeScript 5, Drizzle ORM (postgres-js), Auth.js v5, Zod 4, Tailwind 4, shadcn/ui.

Operating constraint that has bitten us before: **Next 16 has breaking changes vs older versions** — `middleware.ts` was renamed to `proxy.ts`, and other patterns may differ. Before authoring server actions or RSC pages, consult `node_modules/next/dist/docs/01-app/`.

## Goals / Non-Goals

**Goals:**

- Ship a working `/goals` page that lists active goals, shows the right countdown representation per remaining time, and supports create + archive.
- Keep the countdown math fully pure and unit-testable in `src/domain/countdown.ts` so we never need a running DB or browser to verify it.
- Scope every server-side query and action by `session.user.id` so cross-user reads/writes are impossible.
- TDD discipline: every domain function has a failing-first unit test; every server action has a failing-first integration test against real Postgres.
- Keep the live ticker contained to a small client component — the rest of the page stays RSC.

**Non-Goals:**

- Editing existing goals (title, description, deadline). Archive + delete-and-recreate is the MVP path.
- Sub-goals, dependencies between goals, or goal hierarchies.
- Notifications, reminders, or any background jobs related to deadlines.
- Charts or analytics (the 30-day heatmap belongs to the Routines feature, not Goals).
- Per-user timezone overrides — Asia/Taipei is hard-coded for the MVP, matching the spec.
- Optimistic UI for archive — let the server action complete + revalidate.

## Decisions

### D1: Live ticker scope

**Decision:** A goal renders the live `<HoursCountdown>` (60 s tick) only when `daysUntil <= 1`. Above that, it renders a static `Nd` badge from the RSC.

**Rationale:** A 60 s ticker per goal is cheap individually but wasteful when many goals are weeks out. Switching at `<= 1 day` matches the brainstorm decision and limits live re-renders to the period when minute precision actually matters.

**Alternative considered:** Always render live `Xh Ym`. Rejected — anxiety-inducing for multi-week goals and adds React tree churn for no UX benefit.

### D2: Asia/Taipei hard-coded; UTC stored

**Decision:** `deadline_at` is `timestamptz` in UTC. All "days remaining" math uses `Asia/Taipei` calendar boundaries. Domain function signatures take `now: Date` and an optional `tz` defaulting to `'Asia/Taipei'`, and a `TAIPEI_TZ` constant is re-exported for callers that prefer the named import.

**Rationale:** Matches the foundation pattern in `src/domain/taipei.ts`. Storing UTC means we never have to migrate when the user's effective timezone changes; resolving at render time keeps display consistent for the single user.

**Alternative considered:** Convert to local time on insert. Rejected — bakes a timezone into row data and creates migration risk.

### D3: `daysUntil` returns whole calendar days, not floor of hours/24

**Decision:** `daysUntil(deadlineAt, now, 'Asia/Taipei')` returns the difference between the Asia/Taipei calendar day of `deadlineAt` and the Asia/Taipei calendar day of `now`. So a deadline at "Thu 23:59 Taipei" viewed on "Mon 00:01 Taipei" returns `3`, not `2`.

**Rationale:** Matches user mental model ("3 days until Thursday" — calendar days, not 72-hour windows). Mirrors how `todayInTaipei()` already resolves a `YYYY-MM-DD` calendar string.

**Alternative considered:** `Math.floor((deadline - now) / 86_400_000)`. Rejected — DST-stable but mismatches user intuition and makes the day boundary ambiguous near midnight.

### D4: Overdue goals stay in the active list until manually archived

**Decision:** A goal with `status='active'` and `daysUntil < 0` keeps appearing on `/goals`, badged `Overdue Nd` in red. Only the explicit `archiveGoal` server action removes it.

**Rationale:** Forces honest reckoning ("did I actually finish?") rather than letting overdue goals silently disappear.

**Alternative considered:** Auto-flip to `archived` when `now() > deadline_at + grace_period`. Rejected — requires a background job (we have none) or a check-on-read that mutates state implicitly.

### D5: Server actions are the only mutation path

**Decision:** Both `createGoal` and `archiveGoal` are exported from `src/services/goals.ts` with the `'use server'` directive at the top of the file (or at the top of each function, whichever Next 16's docs recommend after I read them). Forms invoke them via `<form action={...}>`. After mutation, the action calls `revalidatePath('/goals')` so the RSC list re-fetches.

**Rationale:** Matches Next 16 convention and the brainstorm decision. No client-side `fetch`. Type-safe end-to-end.

### D6: Zod schemas for input validation, single shared module

**Decision:** Create `src/lib/zod/goals.ts` (a directory split keeps the existing `src/lib/zod.ts` reference in the spec accurate without forcing one fat file). Export `CreateGoalSchema` (title 1–200 chars, optional description ≤2000 chars, deadline as ISO string convertible to `Date` and required to be in the future at validation time). The server action runs `CreateGoalSchema.parse(input)` before any DB call.

**Rationale:** Centralizes validation, shareable with future client-side preview if needed. Path nests under `src/lib/zod/<feature>.ts` so additions for routines/notes don't bloat one file.

**Alternative considered:** Inline Zod in the service file. Rejected — couples validation to orchestration and harder to test in isolation.

### D7: Service queries always re-scope by `userId`

**Decision:** Every query function in `src/services/goals.ts` accepts an explicit `userId: string` parameter and includes it in the `WHERE` clause. The page (RSC) calls `auth()`, asserts a session, then passes `session.user.id` to the query. Server actions do the same — they call `auth()` first, derive `userId`, and pass it to the underlying repo call.

**Rationale:** Defense in depth. Auth.js + middleware should already prevent unauthenticated access, but scoping at the query layer means a future bug in a route or a forgotten `auth()` call cannot leak data.

### D8: shadcn additions

**Decision:** Add `dialog`, `textarea`, and `badge` shadcn primitives via `pnpm dlx shadcn@latest add dialog textarea badge`. Use `Dialog` for the create form (cleaner than inline), `Textarea` for description, `Badge` for the countdown indicator.

**Rationale:** Already established UI dependency. Three small additions are cheaper than rolling our own primitives.

### D9: Test layering

**Decision:**

- `tests/unit/domain/countdown.test.ts` — pure functions, all branches of `daysUntil` (positive, zero, negative, day-boundary edge cases at 23:59/00:01 Taipei) and `hoursMinutesUntil`.
- `tests/integration/services/goals.test.ts` — uses `withRollback` and `seedUser`. Covers `createGoal` (happy + Zod-rejection + cross-user isolation), `listActiveGoals` (empty, multiple, ordering, exclusion of `archived` and `completed`), `archiveGoal` (happy + idempotency + cannot-archive-someone-elses-goal), `getGoal`.
- `tests/component/goals/HoursCountdown.test.tsx` — RTL test that the ticker renders the right initial string and re-renders after a fake-timer advance.
- No E2E in this change set; E2E lives outside CI per the foundation rules.

### D10: Page architecture

**Decision:** `app/(app)/goals/page.tsx` is an `async` RSC. Top-level it calls `await auth()` (the layout already redirects on null, but the explicit assertion narrows the type). It then calls `await listActiveGoals(session.user.id)`. The list renders a flex/grid of `<GoalCard>` (RSC) components plus a `<CreateGoalDialog>` trigger button. Each `<GoalCard>` decides whether to render the static `Nd` badge or mount `<HoursCountdown>` based on `daysUntil`.

**Rationale:** Keeps the data fetch on the server, sends the live-ticker logic to the client only where needed (per D1). Card components stay dumb; the decision lives in one place.

## Risks / Trade-offs

- **[60 s ticker drift]** `setInterval(60_000)` can drift under tab throttling or device sleep. → Mitigation: each tick reads `Date.now()` fresh and recomputes from `deadlineAt`, so wall-clock drift never accumulates; only the next render is delayed.
- **[Server-action revalidation latency]** `revalidatePath('/goals')` triggers a re-fetch but the user might briefly see the pre-archive list. → Mitigation: acceptable for a personal app. If perceived lag becomes annoying, add an optimistic UI later (out of scope per Non-Goals).
- **[Timezone skew between server and Postgres]** All timestamps in Drizzle are `timestamptz`; `now()` defaults inside Postgres are UTC. All app-side math goes through `Asia/Taipei` helpers. → Mitigation: never use raw `new Date()` for display math without going through `src/domain/taipei.ts` or `src/domain/countdown.ts`.
- **[Asia/Taipei has no DST]** Taipei is fixed at UTC+8; no transition edge cases to worry about. Documenting it so a future maintainer doesn't add DST handling that isn't needed.
- **[shadcn `dialog` brings Radix as a transitive dep]** Adds a small client bundle. → Mitigation: acceptable; shadcn is the established UI strategy and Dialog will be reused by future features.
- **[Next 16 server-action API drift]** The `'use server'` placement and `revalidatePath` API may differ from older Next versions the model is more familiar with. → Mitigation: implementation tasks must read `node_modules/next/dist/docs/01-app/` first; tests catch wiring mistakes early.

## Migration Plan

No data migration required. The `goals` table already exists. After this change merges, the user can immediately create goals via the new page; pre-existing rows (if any) appear in the list with the same rendering rules.

Rollback: revert the merge commit. No schema changes to undo.

## Open Questions

- Should the create dialog allow setting an initial `status` other than `'active'`? Spec says no — keeping it implicit. Resolved as **no**, all newly created goals start `active`.
- Should `archiveGoal` be idempotent (no-op if already archived)? Resolved as **yes** — second invocation is a no-op rather than an error, simpler client UX.
- Should the deadline picker prevent selecting past datetimes? Resolved as **yes** — Zod refinement rejects `deadlineAt <= now` server-side; the client picker also disables earlier dates.
