# goal-tree MVP — Design Spec

**Date:** 2026-05-05
**Status:** Approved (brainstorm complete)
**Scope:** Foundation + MVP feature designs for a single-user study helper / routine tracker deployed on Vercel.

---

## 1. Goal

A personal study helper and routine tracker. MVP delivers three user-facing capabilities:

1. **Deadlines with countdown** — long-term goals each have a deadline; the app shows time remaining.
2. **Objectives with daily status** — each goal contains routines (daily sub-tasks) the user marks done/partial/skipped each day.
3. **Structural notes (markdown)** — hierarchical notes written in markdown, optionally linked to a goal.

Future features will be added through an `openspec` → `gh-issue` → branch workflow. This spec also locks the foundation (testing, CI, deployment, conventions) those future features will build on.

## 2. Architecture overview

A single-user Next 16 App Router app deployed to Vercel.

- GitHub OAuth (allowlist of one) gates everything under `app/(app)`.
- All persistence is Neon Postgres via Drizzle ORM.
- Mutations go through Next server actions; reads happen in React Server Components via Drizzle queries.
- Domain logic (countdown math, streak calculation, day-window resolution in Asia/Taipei) lives as pure functions in `src/domain/` so it is fully unit-testable without I/O.
- All timestamps stored as `timestamptz` (UTC); UI defaults to `Asia/Taipei` (UTC+8) for rendering.

## 3. Tech stack (locked)

| Concern | Choice |
|---|---|
| Framework | Next.js 16.2.4 (App Router, RSC, server actions) |
| UI runtime | React 19.2.4 |
| Styling | Tailwind 4 + shadcn/ui (copy-paste components into `src/components/ui/`) |
| Database | Neon Postgres |
| ORM | Drizzle (+ drizzle-kit for migrations) |
| Auth | Auth.js v5 (NextAuth) — GitHub provider, single-ID allowlist |
| Validation | Zod at server-action boundaries |
| Markdown editor | CodeMirror 6 (markdown mode) with preview toggle |
| Markdown render | `react-markdown` + `rehype-sanitize` |
| Test runner | Vitest |
| Component testing | React Testing Library |
| E2E | Playwright (local only — `pnpm test:e2e`) |
| Package manager | pnpm |
| Hosting | Vercel |

> **Note on Next 16 specifics:** `AGENTS.md` warns this Next has breaking changes vs. older versions. Implementation tasks must consult `node_modules/next/dist/docs/` before writing code that touches routing, server actions, caching, or middleware.

## 4. Data model

Drizzle table definitions live one-per-domain under `src/db/schema/`.

```ts
users (
  id              uuid PK,
  github_id       text UNIQUE NOT NULL,
  name            text,
  image_url       text,
  created_at      timestamptz NOT NULL DEFAULT now()
)

goals (
  id              uuid PK,
  user_id         uuid FK → users.id,
  title           text NOT NULL,
  description     text,
  deadline_at     timestamptz NOT NULL,
  status          text NOT NULL CHECK (status IN ('active','completed','archived')) DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
)

routines (
  id              uuid PK,
  user_id         uuid FK → users.id,
  goal_id         uuid FK → goals.id NULL,           -- nullable: standalone routines allowed
  title           text NOT NULL,
  cadence_type    text NOT NULL CHECK (cadence_type IN ('daily','weekdays')),
  weekdays        smallint[] CHECK (
                    cadence_type = 'daily'
                    OR (weekdays IS NOT NULL AND array_length(weekdays,1) BETWEEN 1 AND 7)
                  ),                                  -- 0=Sun..6=Sat
  created_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
)

routine_logs (
  id              uuid PK,
  routine_id      uuid FK → routines.id,
  log_date        date NOT NULL,                      -- already resolved to Asia/Taipei calendar day
  status          text NOT NULL CHECK (status IN ('done','partial','skipped')),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, log_date)
)

notes (
  id              uuid PK,
  user_id         uuid FK → users.id,
  parent_id       uuid FK → notes.id NULL,
  goal_id         uuid FK → goals.id NULL,
  title           text NOT NULL,
  body_md         text NOT NULL DEFAULT '',
  depth           smallint NOT NULL CHECK (depth BETWEEN 0 AND 2),  -- 0=root, max 3 levels total
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

Indexes: `goals(user_id, status)`, `routines(user_id, archived_at)`, `routine_logs(routine_id, log_date DESC)`, `notes(user_id, parent_id)`.

## 5. Feature designs

### 5.1 Deadline countdown (Goals page — `/goals`)

- RSC fetches all goals for the user with `status = 'active'`, ordered by `deadline_at ASC`.
- For each goal, domain function `daysUntil(deadlineAt: Date, now: Date, tz='Asia/Taipei'): number` returns whole calendar days remaining (negative if past).
- If `daysUntil <= 1`, render via a small client component `<HoursCountdown>` that ticks every 60s showing `Xh Ym`.
- If `daysUntil < 0`, badge reads `Overdue Nd` in red. Goal stays in the active list until manually archived via server action `archiveGoal(id)`.
- Goal list supports **many concurrent active goals**.
- Create-goal form: title (required), description (optional), deadline (date+time picker, defaults to 23:59 Asia/Taipei). Validated via Zod.

### 5.2 Routines & daily status (Today page — `/today`)

- Default landing page after sign-in.
- RSC computes `today = todayInTaipei()` (domain function), then fetches routines where `archived_at IS NULL` AND cadence applies today (`cadence_type='daily'` OR `today_weekday ∈ weekdays`), left-joined with `routine_logs` for `today`.
- Each row is a `<RoutineRow>` client component grouped under its parent goal title (or "General" for goal-less routines). The row contains a status button cycling: `unset → done → partial → skipped → unset`. Clicking calls server action `setRoutineStatus(routineId, date, status | null)`.
- Server action enforces: `date` is within the last 2 calendar days (Taipei) — older edits rejected.
- For each routine, show:
  - Current streak (consecutive days from today backward where status ∈ {done, partial}). Domain function `streakLength(logs: RoutineLog[], today: Date, tz='Asia/Taipei')`.
  - 30-day mini-heatmap (30 colored cells) computed server-side from the most recent 30 logs.
- Create-routine form: title, goal (optional dropdown), cadence (radio: daily / weekdays), weekday checkboxes (shown only when "weekdays" selected). Zod validation.

### 5.3 Notes (Notes page — `/notes`)

- Two-pane layout: left sidebar = note tree, right pane = editor.
- Tree is a recursive React component, max **3 levels deep** (depth 0/1/2). The "Add child" button is hidden on depth-2 notes.
- Editor is CodeMirror 6 with markdown mode and a "Preview" toggle button. Preview renders via `react-markdown` + `rehype-sanitize` (no raw HTML allowed).
- Save behavior: on blur and on `Cmd/Ctrl+S`, call server action `saveNote(id, body, title?)`. Debounced auto-save (every 2s while typing) is **out of scope** for MVP — explicit save only.
- An optional "Linked goal" dropdown at the top of the editor lets the user attach the note to a goal (`goal_id`).
- Create-note form: title, parent (optional — defaults to root), goal (optional). Zod validation.

## 6. Auth

- Provider: Auth.js v5 GitHub OAuth.
- `signIn` callback rejects any GitHub ID not equal to `process.env.ALLOWED_GITHUB_ID`. Rejection redirects to a "not authorized" page.
- On first successful sign-in, upsert the `users` row keyed on `github_id`.
- `middleware.ts` protects `app/(app)/**` and any `/api/**` route except `/api/auth/**`. Unauthenticated requests redirect to `/signin`.
- Session strategy: JWT (no session table needed for one user).

## 7. Folder layout

```
app/
  (auth)/
    signin/page.tsx                ← public
    not-authorized/page.tsx        ← public
  (app)/
    layout.tsx                     ← nav + auth guard
    today/page.tsx
    goals/page.tsx
    notes/page.tsx
    notes/[id]/page.tsx
  api/auth/[...nextauth]/route.ts
  layout.tsx
  page.tsx                         ← redirect to /today or /signin
  globals.css

src/
  db/
    schema/
      users.ts
      goals.ts
      routines.ts
      routine_logs.ts
      notes.ts
      index.ts                     ← re-exports
    client.ts                      ← drizzle client (Neon HTTP driver)
    migrations/                    ← generated by drizzle-kit
  domain/                          ← PURE functions, no I/O, no React, no Next imports
    countdown.ts                   ← daysUntil, hoursMinutesUntil
    taipei.ts                      ← todayInTaipei, weekdayInTaipei, isWithinBackfillWindow
    streak.ts                      ← streakLength, build30DayHeatmap
    cadence.ts                     ← appliesOn(routine, date)
  services/                        ← server actions + queries; orchestrate domain + db
    goals.ts
    routines.ts
    routine_logs.ts
    notes.ts
  lib/
    auth.ts                        ← Auth.js config + helpers
    markdown.ts                    ← shared remark/rehype setup
    zod.ts                         ← shared schemas
  components/
    ui/                            ← shadcn primitives
    goals/
    routines/
    notes/

tests/
  unit/                            ← mirrors src/domain/
  integration/                     ← mirrors src/services/, hits real Postgres
  component/                       ← RTL tests for client components
  e2e/                             ← Playwright (local only)
  helpers/
    db.ts                          ← test-db setup, transactional rollback
    fixtures.ts

drizzle.config.ts
vitest.config.ts
playwright.config.ts
middleware.ts
docker-compose.yml                 ← local Postgres for dev + integration tests
.github/workflows/ci.yml
```

**Key principle:** domain logic in `src/domain/` is pure (no DB, no React, no Next imports). Services in `src/services/` orchestrate domain + DB. Components stay dumb.

## 8. Testing strategy

| Layer | Tool | Scope | Runs in CI? |
|---|---|---|---|
| Unit | Vitest | every file under `src/domain/` | yes |
| Integration | Vitest + real Postgres | every file under `src/services/` (server actions + queries) | yes |
| Component | Vitest + RTL | interactive client components (status-cycle button, countdown ticker, note editor wrapper) | yes |
| E2E | Playwright | three flows: sign-in, create-goal-and-log-routine, create-and-edit-nested-note | **no** (local-only via `pnpm test:e2e`) |

- **BDD style:** all tests use `describe('Given …', () => describe('When …', () => it('Then …', …)))`. No Cucumber, no `.feature` files.
- **Integration tests** run against a real Postgres provisioned by `docker compose up db` locally and by a `services: postgres:16` block in CI. Each test runs inside a transaction that rolls back on completion. A single seed user is inserted before the suite.
- **No mocking the database.** Mocking hides the kind of bugs (constraint violations, timezone surprises, drizzle query mistakes) we most want to catch.
- **TDD discipline:** for every domain function, write failing unit test first. For every server action, write failing integration test first.

## 9. CI / CD

`.github/workflows/ci.yml` runs on every push and PR:

```yaml
jobs:
  ci:
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 3s --health-retries 10
    steps:
      - checkout
      - setup pnpm + node 20
      - pnpm install --frozen-lockfile
      - pnpm lint
      - pnpm typecheck
      - pnpm db:migrate            # against the service postgres
      - pnpm test:unit
      - pnpm test:integration
```

E2E intentionally excluded — Playwright runs locally only via `pnpm test:e2e`.

Vercel deployment:
- `dev` branch → preview deploys.
- `main` branch → production.
- Build command: `pnpm build:ci`.
- Required env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_GITHUB_ID`.

## 10. Workflow ground rules (SDD / TDD / BDD)

For every future feature beyond this MVP:

1. **Spec first (SDD).** Author an `openspec` proposal under `openspec/changes/<change-id>/` describing the change and acceptance criteria.
2. **Issue.** Open a GitHub issue via the `gh-issue` skill referencing the openspec change.
3. **Branch.** Create a feature branch via `gh-dev` linked to the issue.
4. **TDD inside the branch.**
   - Write the failing BDD-style test first (red).
   - Implement the minimum to pass (green).
   - Commit. Refactor. Commit. Small commits.
   - Domain logic must be unit-tested before the service that calls it.
   - Server actions must have an integration test against real Postgres before being wired to UI.
5. **PR.** Open via `gh-pr`. PR description links the openspec change and summarises test evidence.
6. **Merge.** Squash to `dev`; release-style merge `dev` → `main`.

## 11. Out of scope for MVP

Explicitly deferred to later openspec proposals:

- Multi-user / sharing.
- Notifications / reminders / email digests.
- Mobile app or PWA install prompts.
- Routine templates / clone-from-existing.
- Note search, backlinks, tagging.
- Note auto-save while typing.
- File/image attachments on notes.
- Goal sub-goals or goal dependencies.
- Analytics / progress charts beyond the 30-day heatmap.
- Custom timezone per user.
- Data export / import.

## 12. Open questions / known risks

- **Neon cold-start latency** on free tier may add ~1s to the first request after idle. Acceptable for personal use; revisit if annoying.
- **Server actions + transactional integration tests:** Drizzle's transaction API works inside Vitest, but we'll need a small `withTestTx` helper to inject the tx-bound DB into the action under test. Pattern to be established in the foundation tasks.
- **CodeMirror 6 in RSC tree:** CodeMirror is client-only; the `<NoteEditor>` must be a client component dynamically imported with `ssr: false` to avoid hydration mismatches.

---

*End of design.*
