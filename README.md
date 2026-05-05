# goal-tree

Personal study helper and routine tracker. Single user, GitHub-OAuth gated, Vercel-deployed.

## Stack

Next 16 (App Router) · React 19 · Tailwind 4 · shadcn/ui · Drizzle ORM · Neon Postgres · Auth.js v5 · Vitest · Playwright (local only).

## Local development

Prereqs: pnpm, Docker, Node 20+.

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
3. Branch via `gh-dev` skill
4. TDD inside the branch (BDD-style describe/it naming)
5. PR via `gh-pr` skill — fills the PR template

## Deploy

Production deploys from `main` via Vercel. Build runs `pnpm build:ci`.

## Docs

- Spec: `docs/superpowers/specs/2026-05-05-goal-tree-mvp-design.md`
- Foundation plan: `docs/superpowers/plans/2026-05-05-goal-tree-foundation.md`
