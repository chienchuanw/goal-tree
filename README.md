# goal-tree

Personal study helper and routine tracker. Single user, GitHub-OAuth gated, Vercel-deployed.

## Status

**MVP complete.** All three core features shipped on `dev` on top of the foundation (Auth.js, Drizzle schema, CI, shadcn/ui, Asia/Taipei domain helpers).

| Feature | Issue | Status |
|---|---|---|
| Goals & countdown — `/goals`, deadline countdown (day badge / live `Xh Ym` ticker / red `Overdue Nd`), create + archive | [#1](https://github.com/chienchuanw/goal-tree/issues/1) | Shipped (PR [#4](https://github.com/chienchuanw/goal-tree/pull/4) merged 2026-05-06) |
| Routines & daily status — `/today`, cadence-aware list, status cycle, streak, 30-day heatmap | [#2](https://github.com/chienchuanw/goal-tree/issues/2) | Shipped (PR [#5](https://github.com/chienchuanw/goal-tree/pull/5) merged 2026-05-06) |
| Markdown notes — `/notes`, hierarchical tree (max 3 levels), CodeMirror 6 editor + preview toggle | [#3](https://github.com/chienchuanw/goal-tree/issues/3) | Shipped (PR [#6](https://github.com/chienchuanw/goal-tree/pull/6) merged 2026-05-06) |
| Archive confirmation + restore — confirm dialog before archiving routines/goals; new `/archive` page lists archived items with a Restore action | [#7](https://github.com/chienchuanw/goal-tree/issues/7) | Shipped (PR [#8](https://github.com/chienchuanw/goal-tree/pull/8) merged 2026-05-06) |
| Perf: co-locate Vercel functions with Neon DB — pin functions to `sin1` via `vercel.json`; raise `postgres-js` `max` so per-request `Promise.all` queries actually parallelize | [#9](https://github.com/chienchuanw/goal-tree/issues/9) | Shipped (PR [#10](https://github.com/chienchuanw/goal-tree/pull/10) merged 2026-05-07) |
| Quantity routines — new `kind='quantity'` routine type that logs a numeric value per day with optional unit + daily target; 30-day bar chart on `/today` with goal line | [#11](https://github.com/chienchuanw/goal-tree/issues/11) | Shipped (PR [#12](https://github.com/chienchuanw/goal-tree/pull/12) merged 2026-05-08) |

## Stack

Next 16 (App Router) · React 19 · Tailwind 4 · shadcn/ui · Drizzle ORM · Neon Postgres · Auth.js v5 · Vitest · Playwright (local only).

Package manager pinned via `package.json` `"packageManager": "pnpm@10.33.0"` — CI's `pnpm/action-setup@v4` reads from this so local and CI never drift.

## Local development

Prereqs: pnpm 10.33+, Docker, Node 20+.

```bash
# 1. Install deps
pnpm install

# 2. Copy env template and fill in GitHub OAuth values
cp .env.example .env.local
# edit .env.local

# 3. Start local Postgres (port 5433 to avoid host Postgres conflicts)
docker compose up -d db

# 4. Apply migrations
pnpm db:migrate

# 5. Run dev server
pnpm dev
```

## Tests

| Command | What it runs |
|---|---|
| `pnpm test:unit` | Pure unit tests (no I/O). Fast. |
| `pnpm test:integration` | Server actions + queries against real Postgres. |
| `pnpm test:e2e` | Playwright. **Local only — not in CI.** |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm lint` | ESLint. |

## Workflow

Every feature beyond foundation:

1. openspec proposal under `openspec/changes/<change-id>/`
2. GitHub issue via `gh-issue` skill
3. Branch via `gh-dev` skill (`issues/N`)
4. Implementation plan via `superpowers:writing-plans` (saved to `docs/superpowers/plans/`)
5. TDD inside the branch (BDD-style `describe('Given …', () => describe('When …', () => it('Then …')))` naming)
6. `simplify` skill pass before opening PR
7. PR via `gh-pr` skill — fills the PR template
8. After merge: archive the openspec change with `openspec archive <name>` so the delta spec is promoted to `openspec/specs/<capability>/spec.md`

## Deploy

Production deploys from `main` via Vercel. Build runs `pnpm build:ci`.

Serverless functions are pinned to `sin1` (Singapore) in `vercel.json` so they sit in the same AWS region as the Neon Postgres host (`ap-southeast-1`). This keeps DB round-trips at single-digit milliseconds; without it, functions land in `iad1` and every query pays a ~220 ms trans-Pacific hop.

## Docs

- Design spec (whole MVP): `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md`
- Foundation plan: `docs/superpowers/plans/2026-05-05-goal-tree-foundation.md`
- Goals feature plan: `docs/superpowers/plans/2026-05-06-goals-and-countdown.md`
- Routines feature plan: `docs/superpowers/plans/2026-05-06-routines-and-daily-status.md`
- Notes feature plan: `docs/superpowers/plans/2026-05-06-markdown-notes-hierarchy.md`
- Archive-confirm + restore design: `docs/superpowers/specs/2026-05-07-archive-confirm-and-restore-design.md`
- Archive-confirm + restore plan: `docs/superpowers/plans/2026-05-07-archive-confirm-and-restore.md`
- Quantity routines design: `docs/superpowers/specs/2026-05-08-quantity-routines-design.md`
- Quantity routines plan: `docs/superpowers/plans/2026-05-08-quantity-routines.md`
- Canonical specs (current): `openspec/specs/`
  - `openspec/specs/goals/spec.md` — Goals & countdown (8 requirements)
  - `openspec/specs/routines/spec.md` — Routines & daily status (9 requirements)
  - `openspec/specs/notes/spec.md` — Markdown notes with hierarchy (10 requirements)
- Archived openspec changes: `openspec/changes/archive/`
  - `2026-05-06-goals-and-countdown/`
  - `2026-05-06-routines-and-daily-status/`
  - `2026-05-06-markdown-notes-hierarchy/`
