# CLAUDE.md

## Project

SyncSpace is an offline-first, real-time collaborative document workspace (portfolio-grade MVP, ~14 days, 2 devs). Users edit rich-text documents together live and keep working offline; the UI must always report whether work is saved locally, syncing, or durably persisted on the server. Read [docs/project-brief.md](docs/project-brief.md) fully before implementing anything.

## Monorepo layout

Yarn workspaces + Turborepo; one modular monolith (no microservices).

- `apps/web` — Next.js App Router, React, Tailwind, shadcn/ui, Tiptap, Yjs, y-indexeddb, Zustand, TanStack Query.
- `apps/api` — NestJS 12 (ESM-only; `module` and `moduleResolution` are `nodenext`; relative imports need `.js` extensions), Prisma, Better Auth, Hocuspocus (shares the HTTP server on `/collaboration`), Swagger.
- Package scope: `@syncspace/*` — `@syncspace/web`, `@syncspace/api`. Set on Day 1; do not rename.

Planned: `packages/contracts` (`@syncspace/contracts`) — added when the first shared schema is needed; built with tsup, consumable by the ESM web and api apps.

Target structure lives in brief §8. Folders are created only once a file needs a home.

## Rules

- If CLAUDE.md conflicts with an AGENTS.md, CLAUDE.md wins.
- Strict TypeScript everywhere. No untyped escape hatches without justification.
- Create a folder only when a file needs one. No empty abstractions or speculative services/packages.
- Never invent package APIs. Check current official docs or `--help` when unsure; verify Better Auth + NestJS and Hocuspocus persistence APIs before building on them.
- No secrets in code. `.env` files are never committed; `.env.example` holds placeholders and is committed. Never put DB URLs, auth secrets or private credentials in `NEXT_PUBLIC_*`.
- Database is Neon only (no Docker, no local Postgres). Each developer uses their own Neon dev branch via a local `.env`. Never point local work at the production branch. Prisma migrations use `DIRECT_URL`; check current Prisma + Neon docs before configuring.
- The backend enforces authorization; hiding UI controls is not authorization. Never trust client-supplied user IDs or roles.
- Avoid unnecessary dependencies. Use shared contracts only where they provide real value.
- Tooling: `apps/api` uses Vitest (unit + e2e via supertest) and oxlint; `apps/web` uses ESLint. Vitest does not emit decorator metadata — add SWC decorator-metadata config once API services use constructor injection.
- Do not treat a WebSocket connection as proof of durable persistence (brief §6.4).

## Workflow

- Work in small, verifiable steps. Inspect the repo before assuming; agree on contracts before building both sides of a boundary.
- After meaningful changes run, in order: `yarn typecheck`, `yarn lint`, `yarn build`.
- Never claim something works without running it. If it was not run, say so plainly.
- Never commit or push unless explicitly asked. Use Yarn only (never npm or pnpm); Node 20+.
- End each task by listing the exact files changed and any known issues, limitations or unresolved questions.

## Commands

Run from the repo root; each maps to a turbo task.

| Command | Purpose |
|---|---|
| `yarn dev` | Start `web` + `api` in dev mode |
| `yarn build` | Build all packages and apps |
| `yarn lint` | Lint |
| `yarn typecheck` | TypeScript check |
| `yarn test` | Run tests |

## Out of scope for now

Deployment, AI features, Redis, microservices, Docker, local database containers. Do not scaffold or add infrastructure for these unless explicitly asked.
