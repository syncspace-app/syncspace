# SyncSpace — Project Brief

> **Tagline:** Your workspace. Always in sync.
> **Type:** Portfolio-grade, offline-first, real-time collaborative document workspace
> **MVP timeline:** 14 days · 2 developers · assisted by Claude Code
> **Name note:** "SyncSpace" is the working name. Renaming later is a find-and-replace plus README update; do not block on it.

---

## 1. Product

SyncSpace lets multiple users create, edit, organize and share rich-text documents together. Users collaborate live when online and keep editing when offline. Local changes synchronize on reconnect without losing valid edits. The UI always tells the user whether work is saved locally, syncing, or durably saved on the server.

### Core promise

1. **Continue working:** editing works offline.
2. **Collaborate naturally:** many users, one document, no destructive overwrites.
3. **Know the state of your work:** local save, sync and server persistence are explicit.

> A connected WebSocket is **never** proof that a document is durably saved.

### Target users

Small teams, students, developers documenting work, product teams, remote teams with unreliable connectivity.

---

## 2. User journeys

- **A. Create:** register/sign in → dashboard → create document → editor → write → changes persist locally and sync → correct save status shown.
- **B. Collaborate:** owner shares with User B → both open the document → both see presence, cursors and selections → edits appear live.
- **C. Offline:** open a previously synced document → connection drops → app shows offline → keep editing (saved to IndexedDB, shown as "locally saved, not synced") → connection returns → reconnect, sync, server confirms → status becomes "Saved".
- **D. Share:** owner opens sharing → invites user as Editor or Viewer → owner can change or revoke → backend and collaboration server enforce changes immediately.

---

## 3. MVP scope

Prioritize a few reliable features over many incomplete ones.

### Must have

**A. Auth** (self-hosted Better Auth): register, email/password login, logout, persistent sessions, password reset, email verification when an email provider is configured, profile, basic settings, protected routes.

**B. Dashboard:** owned documents, documents shared with me, create / rename / delete, search, last-updated info, empty and loading states, responsive navigation.

**C. Editor** (Tiptap): headings, paragraphs, bold/italic/underline/strikethrough, bullet and numbered lists, blockquotes, code blocks, links, horizontal rules, keyboard shortcuts, title editing, toolbar. Clean and distraction-free.

**D. Real-time collaboration** (Yjs + Hocuspocus): multi-user editing, live sync, presence, avatars/initials, live cursors, selection awareness, one room per document.

**E. Offline-first** (y-indexeddb): persist state locally, reopen previously synced documents offline, edit offline, keep pending changes across refresh, auto-reconnect, sync after reconnect, handle expired sessions and failed connections.
Distinguish **cached locally** from **available offline**. Never promise offline access to a document that was never loaded and persisted locally.

**F. Sync status** (key differentiator). Explicit states:

| State | Meaning |
|---|---|
| Saved | Latest local changes confirmed persisted on the server |
| Saving locally | Changes being written to local storage |
| Offline | Server unreachable; local editing available |
| Connecting | Attempting to reconnect |
| Syncing | Pending changes being synchronized |
| Locally saved | Stored locally, not yet confirmed by server |
| Sync error | Sync failed, needs retry |
| Recovery pending | Local or server state needs reconciliation |

The UI must never show "Saved" just because the WebSocket is connected. Status must not rely on color alone.

**G. Sharing and permissions:**

| Operation | Owner | Editor | Viewer |
|---|:-:|:-:|:-:|
| View | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ |
| Share | ✅ | ❌ | ❌ |
| Change permissions | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Delete document | ✅ | ❌ | ❌ |

The backend enforces permissions. Hiding UI controls is not authorization.

**H. Persistence and recovery:** documents in PostgreSQL, Yjs updates stored as binary, persisted via Hocuspocus, restore after server restart, safe handling of duplicate/replayed updates, update history sufficient for recovery. Snapshots only if time permits.

**I. Testing and deployment:** auth, document API, permission, real-time, offline/reconnect, persistence/restart tests; responsive verification; production build verification; deployed frontend and backend.

### Deferred (must not jeopardize the MVP)

AI summaries/assistant/RAG/semantic search, comments and mentions, multiple workspaces, org management, advanced version history, activity feeds, notifications/email automation, file attachments, templates, audit logs, admin analytics, Redis/Kafka/RabbitMQ or any infrastructure not needed for the MVP.

---

## 4. Tech stack (final)

### Frontend (`apps/web`)
Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Tiptap, Yjs, y-indexeddb, Zustand (UI state), TanStack Query (server state), Zod (shared contracts).
Keep client components limited to genuinely interactive parts (editor, collaboration UI).

### Backend (`apps/api`)
NestJS 12 (ESM-only; `module` and `moduleResolution` are `nodenext`; relative imports need `.js` extensions), TypeScript, Prisma, Better Auth, Hocuspocus, Yjs, Swagger/OpenAPI, Zod / class-validator (with clear boundaries).
NestJS owns APIs, authorization, document operations and business logic. Hocuspocus owns real-time Yjs sync. **Both use the same permission rules** (one shared permissions service).

### Database
Neon PostgreSQL (managed, Prisma-compatible, scales to zero). **No Docker and no local Postgres**: development, CI and production all use Neon.

- **Production** uses the Neon `main` branch. Local development never points at it.
- **Each developer has their own Neon dev branch** (e.g. `dev-<name>`) with their own connection string, so migrations and test data don't collide.
- **CI uses a separate Neon branch** via a GitHub repository secret, never production.
- Neon provides a **pooled** and a **direct** connection string. Migrations use the direct one; the running app may use the pooled one. Verify the current Prisma + Neon setup (e.g. `directUrl`) in the official docs before configuring.
- Connections require SSL (`sslmode=require`).
- Neon free-tier compute sleeps when idle, so the first dev query may be slow. Keep unit tests database-free and run integration tests against the dedicated test branch.
- Migrations are committed to Git. Do not rely on the free tier for backups. Check current free-tier limits (storage, compute hours, branches).

### Authentication
Self-hosted Better Auth, running inside `apps/api` only. Next.js uses only the Better Auth client. Do **not** build a second session system. Verify the current NestJS integration pattern early (Nest's body parser must not consume the auth route; check for an official or community adapter). This is not Neon-managed auth.
OAuth is a later enhancement.

### Real-time
Yjs (CRDT), Hocuspocus (WebSocket server), Tiptap collaboration extensions, Yjs Awareness (presence), y-indexeddb (local), PostgreSQL via Prisma (server).
No custom CRDT. No Supabase Realtime for editor sync. Never persist cursor/presence as document history.

### Testing
Vitest (NestJS and frontend; API e2e via supertest, React Testing Library for UI), Playwright (e2e), WebSocket integration tests, GitHub Actions CI. Vitest does not emit decorator metadata, so add SWC decorator-metadata config once API services use constructor injection.

### Tooling and deployment
Yarn, Turborepo, GitHub, Vercel (web), Render (api + Hocuspocus), Neon (database). Linting: oxlint (type-aware) for `apps/api`, ESLint for `apps/web`. No Docker: no local containers and no Dockerfile deployment.
Free tiers sleep when idle: Render and Neon cold starts are independent. Acceptable for a portfolio demo; document it and warm both before demos. Never store durable data on Render's filesystem.

---

## 5. Architecture decisions

### 5.1 Monorepo + modular monolith
Yarn workspaces + Turborepo. One backend deployment exposing REST and WebSocket. **No microservices.** Modules have explicit boundaries. Extract a service (collaboration, AI, search, notifications) only when independent scaling or deployment is justified.

### 5.2 High-level view

```text
apps/web (Next.js) ──REST + auth cookies──▶ apps/api (NestJS)
       │                                      ├─ /api/auth/*   → Better Auth
       │                                      ├─ /documents…   → REST modules
       └──WebSocket /collaboration──────────▶ └─ /collaboration → Hocuspocus
                                                     │
                                              Prisma → Neon Postgres
Browser: Yjs doc ⇄ y-indexeddb (namespaced per user + document)
```

Hocuspocus shares the NestJS HTTP server and handles WebSocket upgrades on `/collaboration`, while staying an independently structured module.

### 5.3 REST authorization
Better Auth establishes the session → client sends authenticated requests → NestJS verifies the session → identifies the user → checks resource permissions.

### 5.4 WebSocket authorization (critical)
1. Verify authentication before joining.
2. Hocuspocus authenticates the connecting user.
3. Check document membership and role in the database.
4. Allow joining only if authorized.
5. Enforce write permission (viewers connect read-only).
6. Revoked users must stop being able to submit updates; close their open connections on revocation.

Browser WebSockets cannot set arbitrary headers. Use same-origin session verification or a short-lived, scoped connection credential. No long-lived tokens in query strings.
**Open decision (resolve by Day 5, test in the early deploy):** Vercel and Render are different origins, so either (a) a custom domain with subdomains and a shared cookie domain, or (b) a short-lived WebSocket token issued by the REST API plus carefully configured `SameSite=None; Secure` cookies.
Never trust a client-supplied user ID or role. Derive identity from credentials, role from the database.

---

## 6. Offline-first and sync design

The most technically important part of the project.

### 6.1 Data flow
Edit → Yjs update → (a) local IndexedDB, (b) WebSocket → Hocuspocus → Yjs doc → database write → Postgres commit → **persistence acknowledgement** → client status updated.

This is conceptual. The implementation must explicitly establish how the client knows a given update reached durable server persistence.

### 6.2 Local persistence
y-indexeddb, namespaced by account and document (e.g. `syncspace:{userId}:{documentId}`). Preserve edits across refresh, keep pending edits offline, avoid cross-account leakage, never delete pending local updates before they are safely synced. Clear a user's local databases on logout.

### 6.3 Server persistence
Hocuspocus persistence hooks + Prisma. Store Yjs updates as binary (BYTEA), never JSON. Handle duplicate/replayed updates safely. Use transactions where appropriate. Document metadata is stored separately. Restore Yjs documents after restart. Use incremental updates with periodic snapshots/compaction; never write a full snapshot on every keystroke.

### 6.4 Save acknowledgement semantics
Do **not** mark "server-saved" because the WebSocket is connected, an update was sent, an editor event completed, or an IndexedDB write succeeded.

Lifecycle: edit → Yjs update → local persist → transmit → server applies → durable DB commit → server acknowledges → client marks server-saved.

Hocuspocus persistence hooks may be debounced, so a normal sync event does not prove a Postgres commit. **Design the acknowledgement contract before building the final save indicator.** (Hocuspocus stateless messages are a candidate transport; verify against current docs.)

### 6.5 Reconnection
Detect connectivity → re-establish WebSocket → re-authenticate if needed → sync remote state → exchange pending local updates → let Yjs reconcile → persist the result → confirm durable persistence → update the UI. Never blindly overwrite remote state with local state.

### 6.6 Failure scenarios to test (required, not polish)
- Refresh while offline
- Close and reopen browser while offline
- Backend restart during editing
- Database temporarily unavailable
- WebSocket disconnect during active editing
- Session expiration
- User loses permission while connected
- Multiple collaborators edit the same paragraph
- Local changes pending for a long time
- Sign out, then another user signs in on the same browser
- Duplicate updates received
- Server restarts before persistence completes

---

## 7. Database design

Use UUID ids, foreign keys, indexes, unique constraints, transactions. Credentials never reach the frontend; Neon is accessed only through the backend. Prisma migrations are version controlled. Database setup must be repeatable: a new developer creates a Neon dev branch, copies the connection strings into a local `.env`, and runs the Prisma migrations.

### Auth tables
Owned by Better Auth (User, Session, Account, Verification). Use its schema generation and migration guidance; do not recreate them by hand.

### Application tables (initial; refine during implementation)
- **UserProfile:** id, userId, displayName, avatarUrl, bio, preferences, createdAt, updatedAt
- **Document:** id, title, ownerId, createdAt, updatedAt, deletedAt (optional soft delete)
- **DocumentMember:** id, documentId, userId, role, invitedAt, joinedAt, createdAt, updatedAt. Unique (documentId, userId)
- **DocumentInvitation** (if invitations are a separate flow): id, documentId, email, role, tokenHash, invitedBy, expiresAt, acceptedAt, createdAt
- **DocumentUpdate:** id, documentId, updateData (BYTEA), createdAt. Index (documentId, createdAt). Consider batching and retention.
- **DocumentSnapshot:** id, documentId, snapshotData (BYTEA), createdAt, createdBy (optional)
- **DocumentVersion** (post-MVP): id, documentId, snapshotId, label, createdBy, createdAt
- **DocumentActivity** (post-MVP): do not overbuild.

---

## 8. Repository structure

**Principle: create folders only when the first file needs a home. No empty abstractions.**

### Package names
`@syncspace/web` (apps/web) and `@syncspace/api` (apps/api) are set and must not be renamed. `@syncspace/contracts` (packages/contracts) is planned: added when the first shared schema is needed.

### Target structure (grows over time)

```text
syncspace/
├── apps/
│   ├── web/                      # Next.js (App Router)
│   │   ├── app/
│   │   │   ├── (marketing)/      # landing
│   │   │   ├── (auth)/           # login, register, forgot-password
│   │   │   └── (workspace)/      # dashboard, documents/[documentId], settings
│   │   ├── components/           # ui (shadcn only), layout, dashboard,
│   │   │                         # editor, collaboration, sharing, sync
│   │   ├── features/document-sync/   # plain TS, no React where possible:
│   │   │                             # session creation, sync state machine,
│   │   │                             # persistence-ack handling, hook
│   │   ├── lib/                  # auth-client, api-client, utils
│   │   └── tests/
│   └── api/                      # NestJS
│       ├── src/
│       │   ├── config/           # zod-validated env
│       │   ├── database/         # PrismaService
│       │   ├── common/
│       │   └── modules/
│       │       ├── auth/         # Better Auth setup + guard
│       │       ├── users/
│       │       ├── documents/    # includes members/sharing initially
│       │       ├── permissions/  # PermissionsService (shared by REST + WS)
│       │       └── collaboration/
│       │           ├── hocuspocus/
│       │           ├── persistence/
│       │           └── ack/      # durable-save acknowledgement
│       ├── prisma/               # schema.prisma + migrations
│       └── test/
├── packages/
│   └── contracts/                # PLANNED: zod schemas + shared types (tsup)
├── docs/                         # this brief + design docs + ADRs
├── .github/workflows/ci.yml
├── .env.example
├── package.json  .yarnrc.yml  turbo.json  tsconfig.base.json
└── README.md
```

Add `packages/config`, `hooks/`, `stores/`, `services/`, `versions/` or a separate `members/` module only when real code needs them. Keep shadcn components inside `apps/web`.

### Shared contracts build
`@syncspace/contracts` is planned: added when the first shared schema is needed. It will be built to `dist` with tsup (CJS + ESM + types) so both the ESM web and api apps can consume it without importing raw TS from another package.

### Design rules
- Editor components are client-only (dynamic import, SSR off); other pages stay server components.
- Viewer read-only enforcement happens server-side in Hocuspocus authentication.
- Env vars validated with zod at API startup; missing secrets fail fast.
- API: `GET /health`, `start` script (`node dist/main.js`), listens on `process.env.PORT ?? 4000` at `0.0.0.0`.
- Prisma: `generate` in build, `migrate deploy` for production, `migrate dev` locally.

---

## 9. UI/UX direction

A polished productivity SaaS feel. References: Outline (organization), Notion (editor usability), Linear (visual discipline, dark theme), shadcn/ui (components).

**Principles:** minimal and modern, clean typography (Inter, alt Geist Sans), generous editor whitespace, compact navigation, subtle animation, consistent spacing and radius, accessible contrast, responsive.

**Themes:** Minimal Light (default), Linear-inspired Dark, Soft Indigo. Semantic shadcn CSS-variable tokens, no hardcoded colors. Accent `#6254E8`, light bg `#F7F7FB`, dark bg `#14141C`. Support system preference and persist the choice. Accent customization is optional.

**Screens:** landing, sign-in, registration, dashboard, editor, presence states, sharing dialog, profile/settings, theme settings, empty, loading, offline/reconnect, and error/recovery states.

**Responsive:** desktop (persistent sidebar, full toolbar, presence in header), tablet (collapsible sidebar, condensed toolbar), mobile (compact navigation, touch-friendly, full-screen editor, compact toolbar, bottom-sheet sharing, visible offline/save indicators, no horizontal page scroll). Test at 320, 375, 768, 1024 and 1440px. Do not just scale down the desktop UI.

---

## 10. Requirements

### Functional
- **Auth:** FR-01 register · FR-02 sign in/out · FR-03 sessions persist · FR-04 protected routes · FR-05 profile
- **Documents:** FR-06 create · FR-07 list accessible · FR-08 rename · FR-09 delete · FR-10 search · FR-11 load persisted state
- **Collaboration:** FR-12 multi-user editing · FR-13 real-time propagation · FR-14 presence and cursors · FR-15 concurrent edits reconcile
- **Offline:** FR-16 cached documents editable offline · FR-17 local edits survive refresh · FR-18 connectivity loss detected · FR-19 automatic reconnect · FR-20 pending changes sync · FR-21 UI shows correct persistence state
- **Permissions:** FR-22 owners share · FR-23 Editor/Viewer roles · FR-24 viewers cannot modify · FR-25 unauthorized users get no data · FR-26 revoked members cannot write
- **Persistence:** FR-27 changes persist to PostgreSQL · FR-28 recover after restart · FR-29 duplicates handled safely · FR-30 local and remote reconcile after disconnection

### Non-functional
- **Performance:** fast dashboard, responsive typing, near-real-time collaboration, no full-document writes per change, avoid needless re-renders and polling.
- **Reliability:** local changes survive refresh, server data survives restart, interruptions don't destroy work, reconnection is safe and idempotent, failed writes are observable and recoverable.
- **Security:** no secrets in frontend bundles, validate all input, backend authorization, secure WebSocket auth, no unauthorized access, no cross-account cache leakage, revalidate permissions for connected collaborators, rate-limit sensitive endpoints.
- **Accessibility:** semantic HTML, keyboard navigation, visible focus, labeled forms, contrast, screen-reader status messages, no color-only sync state.
- **Maintainability:** strict TypeScript, consistent lint/format, small domain modules, shared contracts, migrations, meaningful tests, architecture docs.

---

## 11. API surface (initial)

- **Auth:** owned by Better Auth. Do not recreate its endpoints.
- **Documents:** `POST /documents` · `GET /documents` · `GET /documents/:documentId` · `PATCH /documents/:documentId` · `DELETE /documents/:documentId`
- **Members:** `GET /documents/:documentId/members` · `POST /documents/:documentId/invitations` · `PATCH /documents/:documentId/members/:memberId` · `DELETE /documents/:documentId/members/:memberId`
- **User:** `GET /users/me` · `PATCH /users/me`
- **Versions (optional):** list / create / restore
- **Utility:** `GET /health`
- **Collaboration:** dedicated WebSocket endpoint; room names use stable document ids.

---

## 12. Environment variables

`.env.example` contains placeholders only. Review which variables truly need to be public. Never put DB URLs, auth secrets or private credentials in `NEXT_PUBLIC_*`. Use separate dev and production credentials.

```env
# Database (Neon). Each developer uses their own dev branch.
# DATABASE_URL: pooled connection string (used by the running app)
# DIRECT_URL: direct connection string (used by Prisma migrations)
DATABASE_URL=
DIRECT_URL=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Frontend (public)
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=

# Backend
PORT=4000
WEB_ORIGIN=

# Optional email
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=
```

---

## 13. Delivery plan

Work is ticket-based: one branch per ticket, merged via pull request, `main` protected, CI required (lint, typecheck, build, test).

### Phases
1. **Local-first:** monorepo skeleton → Neon dev branches + Prisma → Better Auth spike in Nest → CI. Build features against localhost, with each developer's own Neon dev branch as the database.
2. **Deploy the skeleton early** (once auth works): Vercel + Render + Neon with login and `/health`. Prove cross-domain cookies and a WebSocket connection to Render **early**, not on Day 13.
3. **Build features with auto-deploy:** every merge to `main` redeploys; Vercel previews for PRs.
4. **Demo hardening:** warm up Render and Neon before demos, document cold starts, record the demo flow.

### 14-day roadmap (aggressive; reduce scope rather than reliability if time is short)

**Week 1: foundation and collaboration**
- **Day 1:** monorepo, Next + Nest, Prisma + Postgres, Better Auth proof of concept, contracts, `.env.example`, architecture notes. *Accept:* both apps run, DB connects, migration works, auth POC works, both devs can run it.
- **Day 2:** auth pages, logout, session persistence, protected routes, Nest auth integration, profile and initial document/member schema, Swagger. *Accept:* register/login works, session survives refresh, protected endpoints reject anonymous requests.
- **Day 3:** dashboard, document CRUD APIs, per-user access, empty/loading states, search. *Accept:* create/view/rename/delete works; users can't see others' private documents.
- **Day 4:** Tiptap editor, toolbar, formatting, title editing, temporary basic persistence checkpoint (to be replaced by Yjs state). *Accept:* rich text works and reloads; responsive layout.
- **Day 5:** Yjs, Hocuspocus, Tiptap collaboration, rooms, WebSocket auth, initial sync, basic persistence hooks. *Accept:* two sessions share edits; unauthorized users cannot join.
- **Day 6:** awareness, avatars, cursors, selections, connection indicators, reconnect handling. *Accept:* two users collaborate, see each other, concurrent edits reconcile.
- **Day 7:** integration checkpoint. *Accept:* two authenticated users collaborate on a shared document. No advanced features until this works.

**Week 2: offline, reliability, sharing, deployment**
- **Day 8:** y-indexeddb, per-account namespacing. *Accept:* cached document stays editable offline through a refresh.
- **Day 9:** network detection, reconnect, sync status UI, session expiry, failed sync. *Accept:* offline edit syncs after reconnect; locally saved vs server-persisted is visible.
- **Day 10:** durable Postgres persistence, binary updates, duplicate handling, restart recovery, acknowledgement behavior, snapshots if time permits. *Accept:* state survives restart; never falsely reports server persistence.
- **Day 11:** member APIs, invitations, roles, sharing UI, revocation, REST and WebSocket enforcement. *Accept:* owner/editor/viewer behave consistently everywhere.
- **Day 12:** reliability tests (auth, CRUD, authorization, concurrency, offline, restart, account switch), responsive checks, bug fixes. *Accept:* core workflows pass repeatable tests.
- **Day 13:** production deploy, env vars, migrations, CORS/trusted origins, WebSocket and cookie verification, logging, README. *Accept:* deployed app works end to end with two accounts.
- **Day 14:** full end-to-end verification, screenshots, demo script, architecture and limitations docs, tag the release. *Accept:* working, deployable, documented MVP.

### Developer split
- **Developer 1 (frontend/UX):** Next.js, auth screens, dashboard, Tiptap UI, Yjs frontend, IndexedDB, presence UI, sync UI, sharing dialog, responsive layouts, frontend tests.
- **Developer 2 (backend/infra):** NestJS architecture, Better Auth, Prisma/migrations, Neon, document APIs, permissions, Hocuspocus, Yjs persistence, WebSocket auth, recovery, backend tests, deployment config.
- **Shared:** Day 1 architecture and contracts, Yjs lifecycle, auth handshake, offline/reconnect behavior, persistence acknowledgement, permission revocation, integration testing, final verification. Agree on contracts before building either side.

---

## 14. Anti-patterns (do not)

1. Start with microservices
2. Build a custom CRDT
3. Build a custom rich-text editor
4. Use Supabase Realtime for document sync
5. Store Yjs updates as JSON
6. Write the whole document to Postgres on every keystroke
7. Treat a WebSocket connection as durable persistence
8. Implement frontend-only permissions
9. Let revoked users keep submitting updates
10. Store important data on Render's ephemeral filesystem
11. Put database credentials in frontend code
12. Build AI features before collaboration works
13. Add Redis or brokers without demonstrated need
14. Create unnecessary abstractions, folders or packages
15. Add UI that doesn't support the core promise

**Prioritize:** clear domain boundaries, reliable persistence, correct authorization, observable sync, simple deployment, maintainable TypeScript, automated tests for critical behavior.

---

## 15. Future scope (after MVP)

- **AI:** summaries, meeting notes to action items, document Q&A (RAG), semantic search, writing assistance, auto-organization. AI must only use documents the user is authorized to access.
- **Collaboration:** comments, mentions, threads, notifications, multiple workspaces, org management, advanced version history, document comparison, activity timelines.
- **Infrastructure:** snapshot compaction, background workers, Redis for multi-instance collaboration, horizontal scaling, observability, backup/restore automation.
- **Product:** mobile app, templates, attachments, export to PDF/Markdown, public share links, team admin, enterprise permissions.

---

## 16. Definition of done

- [ ] Register and log in; session persists across refresh
- [ ] Create and manage documents
- [ ] Rich-text editing works
- [ ] Two users edit the same document; presence and cursors work; changes sync in real time
- [ ] Cached documents editable offline; offline changes survive refresh
- [ ] Reconnection syncs pending changes
- [ ] UI distinguishes local saving from server persistence
- [ ] Data survives backend restart
- [ ] Owner/editor/viewer permissions enforced; revoked users cannot write
- [ ] Responsive across target breakpoints
- [ ] Production deployment works
- [ ] Critical workflows have tests
- [ ] README and architecture docs complete

---

## 17. Portfolio positioning

SyncSpace should show more than CRUD:

- **Frontend:** Next.js/React architecture, Tiptap integration, complex client state, accessible responsive UI, collaborative and offline-first UX.
- **Backend:** NestJS modules, auth and authorization, PostgreSQL design, Prisma transactions, WebSockets, binary persistence, recovery engineering.
- **Distributed systems concepts:** CRDTs, concurrent editing, update-based persistence, eventual sync, offline-first design, acknowledgement semantics, consistency/durability trade-offs.
- **AI-assisted engineering:** architecture-first prompting, structured plans, code review, test generation, debugging, documentation, and human validation of AI output.

The strongest demo shows two users collaborating, one disconnecting, continuing to edit, then reconnecting and converging, with the status indicator telling the truth throughout. Do not claim production scale or guarantees that have not been tested.

---

## 18. Instructions for Claude Code

You are a senior software architect and implementation partner for SyncSpace. Help build a maintainable, secure, demonstrable portfolio-grade application within the 14-day MVP scope.

1. Read this entire brief before implementing anything.
2. Inspect the current repository before making assumptions.
3. Do not generate the whole application in one pass; work in small, verifiable phases.
4. Preserve architectural boundaries.
5. Prefer official documentation and current supported APIs. Never invent package APIs; check docs or `--help` when unsure.
6. Verify Better Auth + NestJS integration before building auth-dependent features.
7. Verify exact Hocuspocus integration and persistence APIs before implementing collaboration.
8. Avoid unnecessary dependencies. Keep TypeScript strict.
9. Use shared contracts only where they provide real value.
10. Add tests alongside critical functionality.
11. After meaningful changes run typecheck, lint and build.
12. Never claim a feature works without testing it.
13. Explain significant architectural decisions.
14. Report exact files changed, plus known limitations and unresolved issues.
