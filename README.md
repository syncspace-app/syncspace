# SyncSpace

Offline-first, real-time collaborative document workspace.

Read the [project brief](docs/project-brief.md) before contributing. It is the
source of truth for scope, architecture, and product decisions. The
[backend architecture](docs/backend-architecture.md) document explains how the
API applies it.

## Stack

- **Web** (`apps/web`): Next.js (App Router), React, TypeScript, Tailwind CSS,
  shadcn/ui, Tiptap, Yjs, y-indexeddb, Zustand, TanStack Query.
- **API** (`apps/api`): NestJS, TypeScript (ESM), Prisma, Better Auth,
  Hocuspocus, Swagger.
- **Database**: Neon PostgreSQL (no local Postgres, no Docker).
- **Monorepo**: Yarn workspaces + Turborepo.
- **Quality**: oxlint (API), ESLint (web), Prettier, Vitest, Playwright,
  Husky + lint-staged, GitHub Actions.

## Prerequisites

- Node.js 20+ (24 LTS recommended)
- Corepack (bundled with Node)
- Git
- A [Neon](https://neon.tech) account with a personal dev branch (required by
  environment validation before the API starts)

## First-time setup

```bash
# 1. Enable the pinned package manager (check packageManager in package.json)
corepack enable

# 2. Install all workspace dependencies
yarn install

# 3. Create your local environment file, then fill in the values
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env

# 4. Start web + api in watch mode
yarn dev
```

The API validates its environment at startup. `DATABASE_URL`, `DIRECT_URL`, and
`BETTER_AUTH_SECRET` are required; missing or invalid values stop startup with a
list of problems. Generate the secret with `openssl rand -base64 32`.

- Web: http://localhost:3000
- API health: http://localhost:4000/health

## Commands

Run from the repository root; each maps to a Turborepo task where applicable.

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `yarn dev`          | Start `web` + `api` in watch mode         |
| `yarn build`        | Build every workspace                     |
| `yarn lint`         | Lint every workspace                      |
| `yarn typecheck`    | TypeScript check every workspace          |
| `yarn test`         | Unit tests                                |
| `yarn test:e2e`     | API end-to-end tests (Vitest + supertest) |
| `yarn format`       | Format the repository with Prettier       |
| `yarn format:check` | Verify formatting without writing changes |

## Git hooks

Husky is installed by the `prepare` script on `yarn install`.

- **pre-commit**: formats staged files (`lint-staged`) and runs `yarn lint`.
- **pre-push**: runs `yarn typecheck`.

Never bypass hooks with `--no-verify` unless you are diagnosing a hook problem.

## Logging

API logs are written to stdout/stderr (Render captures both). Development uses
readable coloured text; production uses JSON. Every response includes an
`x-request-id` header for correlation. Inject `AppLogger` instead of using
`console.log`; never log passwords, tokens, cookies or request bodies.

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `yarn install --immutable`
2. `yarn format:check`
3. `yarn lint`
4. `yarn typecheck`
5. `yarn build`
6. `yarn test`
7. `yarn test:e2e`

Configure `main` branch protection so CI must pass before merging.

## Repository layout

```text
apps/
  api/   # NestJS + Prisma + Hocuspocus
  web/   # Next.js App Router
docs/    # project brief and design docs
```

Folders are created only when a file needs a home. See brief §8.

## Environment

All variables are documented in [`.env.example`](.env.example). Rules:

- `.env` is never committed.
- Never put database URLs, auth secrets, or private credentials in a
  `NEXT_PUBLIC_*` variable.
- Use a separate Neon dev branch per developer; CI uses a dedicated branch.
