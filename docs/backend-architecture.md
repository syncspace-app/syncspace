# Backend architecture

`apps/api` is a NestJS 12 modular monolith (ESM). The
[project brief](project-brief.md) is the source of truth; this document records
how the backend applies it.

## Layers

```text
HTTP / WebSocket edge
  Controller / Hocuspocus extension
            ↓
Application
  Service (business rules, transactions)
            ↓
Data
  PrismaService
```

Rules:

- Controllers parse input and call services. No Prisma calls in controllers.
- Services own business rules and transaction boundaries.
- Database access stays behind `database/`. Guards and controllers do not query
  Prisma directly.
- Authorization is always enforced by the backend. Hidden UI controls are not
  authorization.
- Never trust client-supplied user IDs or roles. Derive identity from the
  session; derive the role from the database.
- REST and Hocuspocus must use the same permissions rules once
  `PermissionsService` exists.

## Directory map

Folders are created only when the first real file needs one. The planned shape:

```text
src/
├── config/              # zod env schema + validateEnv (exists)
├── database/            # PrismaModule + PrismaService (next)
├── common/              # logger, filters, interceptors, guards (as needed)
├── modules/
│   ├── auth/            # Better Auth setup + session guard
│   ├── users/           # GET/PATCH /users/me
│   ├── documents/       # document CRUD + members/sharing (initially)
│   ├── permissions/     # PermissionsService shared by REST and Hocuspocus
│   └── collaboration/   # Hocuspocus server, persistence, ack
│       ├── hocuspocus/
│       ├── persistence/
│       └── ack/
├── app.module.ts
└── main.ts
```

The planned folders currently carry `.gitkeep` markers so the structure is
visible in Git. Remove a marker when the first real file lands; do not add
placeholder modules, controllers, or services.

## Request flow

1. CORS is configured once in `main.ts`.
2. The auth guard verifies the session (when auth exists).
3. The controller receives validated input. When DTOs are added, use Nest's
   `StandardSchemaValidationPipe` with zod schemas rather than class-validator.
4. The service checks document access through `PermissionsService`.
5. `PrismaService` performs the query or transaction.
6. Nest exception filters shape error responses. Add a global filter only when
   a real cross-cutting error shape exists.

## WebSocket flow (later)

- Hocuspocus authenticates the connection before a room join.
- It checks membership and role in PostgreSQL through the same permissions rules
  used by REST.
- Viewers join read-only. Revoked users are disconnected and cannot submit
  updates.
- Presence and cursor data is ephemeral and never stored as document history.
- Durable-save acknowledgement is explicit. A connected WebSocket is never proof
  that an update reached PostgreSQL.

## Configuration

- `src/config/env.ts` defines the zod schema and `validateEnv`.
- `ConfigModule.forRoot` validates at startup and fails fast on missing values.
- Use `ConfigService<Env, true>` for typed access.
- The local `.env` lives at the repository root. Turbo runs API tasks with cwd
  `apps/api`, hence `envFilePath: ['../../.env']`.
- Tests load `test/setup-env.ts` and never depend on a developer `.env`.

## Alignment with the project brief

Do not replace these decisions with a generic NestJS template:

- **Yarn 4 workspaces, not pnpm.** The repository, lockfile, and CI already use
  Yarn. A `pnpm-workspace.yaml` must not be added.
- **Better Auth sessions inside `apps/api`.** No JWT strategy, no hand-written
  register/login service, and no second session system. Better Auth owns the
  User, Session, Account, and Verification tables.
- **`src/database/` holds `PrismaService`.** The Prisma schema and migrations
  live in `apps/api/prisma/`, not `src/prisma/`.
- **Documents owns members/sharing initially.** Extract a separate `members`
  module only when the documents module genuinely becomes too large.
- **Collaboration owns persistence and acknowledgement.** `persistence/` and
  `ack/` are subfolders of `modules/collaboration/`, not top-level modules.
- **No repository layer over Prisma** unless a real need appears. Services use
  `PrismaService` directly; extra repositories duplicate Prisma for no gain.
- **Use Nest's `StandardSchemaValidationPipe` with zod.** Do not write a custom
  zod validation pipe or add class-validator.
- **The shared package is `@syncspace/contracts`** (`packages/contracts`), added
  when the first schema is genuinely shared. Do not create `packages/shared`
  with speculative schemas.
- **User-facing version history is deferred** by the MVP brief. Snapshots still
  exist for persistence, compaction and crash recovery; they are not the same
  feature.
- **Add modules, common utilities, and docs only when a real file needs them.**
  The current `.gitkeep` folders are structure markers only; do not add
  placeholder modules, controllers, or services.

## Logging

- `common/logger/AppLogger` extends Nest's `ConsoleLogger`: readable text in
  development, JSON in production, with common secret keys redacted.
- `requestIdMiddleware` ensures every request has an `x-request-id` and echoes
  it on the response.
- `LoggingInterceptor` logs successful request completion with method, path,
  status code and duration.
- `AllExceptionsFilter` logs failures with stack traces for 5xx errors and
  returns `{ statusCode, message, requestId, path, timestamp }`.
- Constructor injection uses explicit `@Inject(AppLogger)` tokens because
  Vitest/esbuild does not emit decorator metadata. Keep that pattern until SWC
  decorator metadata is configured.
- Inject `AppLogger` into services. Never log passwords, tokens, cookies or raw
  request bodies.

## Build order

1. Prisma + Neon: `database/` module, first migration, restart recovery.
2. Better Auth spike inside Nest, then session guard and auth module.
3. `users`, `documents`, and the shared permissions module.
4. Collaboration: Hocuspocus, Yjs persistence, acknowledgement contract.
5. Hardening, integration tests, deployment.
