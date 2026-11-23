# SyncSpace: Low-Level Design

> **Status:** v2 · **Updated:** 2026-11-22
> **Audience:** the two developers building the MVP (and interviewers who want depth).
> **Start with:** [High-level architecture](./architecture-hld.md). This document assumes you have read it.

**Conventions**

- **⚠ Verify** means "depends on a third-party API or free-tier limit; confirm against current official docs before building on it". Never guess an API.
- Backend routes live under `/api`. Document ids are UUIDs. **User ids are text**, because Better Auth owns the user table (⚠ Verify its id type).
- Nest 12 is ESM-only here: `module` and `moduleResolution` are `nodenext`, and relative imports end in `.js`.
- Numbers such as limits and timeouts are **starting values**. Tune them after measuring.

---

## 1. Repository structure

Create a folder only when a file needs it.

```text
syncspace/
├── apps/
│   ├── web/                          # Next.js (App Router)
│   │   ├── app/
│   │   │   ├── (marketing)/page.tsx            # landing
│   │   │   ├── (auth)/login  register  forgot-password
│   │   │   ├── (workspace)/dashboard  documents/[documentId]  settings
│   │   │   ├── invite/page.tsx                 # reads the token from the URL fragment
│   │   │   └── layout.tsx                      # theme + query providers
│   │   ├── components/                         # ui (shadcn), layout, dashboard,
│   │   │                                       # editor, sharing, sync, collaboration
│   │   ├── features/document-sync/             # plain TypeScript, no React:
│   │   │                                       # session, deriveStatus, flush, pending marker
│   │   ├── lib/                                # api client, auth client, i18n messages
│   │   └── tests/
│   └── api/                          # NestJS 12 (ESM)
│       ├── src/
│       │   ├── config/  database/  common/
│       │   └── modules/
│       │       ├── auth/  users/  permissions/
│       │       ├── documents/                  # documents, members, invitations
│       │       └── collaboration/              # hocuspocus, tickets, persistence, flush
│       ├── prisma/                             # schema + migrations
│       └── test/
├── packages/contracts/                         # planned: shared zod schemas and message types,
│                                               # created when the first shared type is needed
├── docs/                                       # brief, HLD, LLD, design screenshots
└── .github/workflows/ci.yml
```

---

## 2. Backend

### 2.1 Module graph

```mermaid
flowchart LR
  APP["AppModule"]
  CFG["config<br/>zod-validated env"]
  DBM["database<br/>PrismaService"]
  AUTHM["auth<br/>Better Auth + SessionGuard"]
  USR["users"]
  DOC["documents<br/>documents, members, invitations"]
  PERM["permissions<br/>PermissionsService"]

  subgraph COLLAB["collaboration"]
    HPM["hocuspocus<br/>server and hooks"]
    TKT["tickets"]
    PST["persistence<br/>write queue, update store"]
    FLH["flush handler"]
  end

  APP --> CFG
  APP --> DBM
  APP --> AUTHM
  APP --> USR
  APP --> DOC
  APP --> PERM
  APP --> COLLAB
  AUTHM --> DBM
  USR --> DBM
  DOC --> DBM
  DOC --> PERM
  PERM --> DBM
  TKT --> AUTHM
  HPM --> TKT
  HPM --> PERM
  HPM --> PST
  HPM --> FLH
  FLH --> PST
  PST --> DBM
  DOC -.->|"MemberRevoked, DocumentDeleted events"| HPM
```

**Rule:** `documents` and `collaboration` never import each other. The only link is an in-process event, which avoids a circular dependency.

### 2.2 Key classes

```mermaid
classDiagram
  class SessionGuard {
    +canActivate(ctx) boolean
  }
  class PermissionsService {
    +getRole(userId, documentId) Role
    +can(role, action) boolean
    +assertCan(userId, documentId, action) void
  }
  class DocumentsService {
    +create(userId, title) Document
    +listAccessible(userId, scope, q) Document[]
    +rename(userId, id, title) Document
    +remove(userId, id) void
  }
  class MembersService {
    +list(userId, docId) Member[]
    +changeRole(userId, docId, memberId, role) Member
    +revoke(userId, docId, memberId) void
  }
  class InvitationsService {
    +create(userId, docId, role, options) NewInvite
    +list(userId, docId) Invite[]
    +revoke(userId, docId, inviteId) void
    +accept(userId, token) DocumentId
  }
  class TicketService {
    +issue(userId, documentId) string
    +verify(token) TicketClaims
  }
  class CollaborationServer {
    +onAuthenticate(data) Context
    +onLoadDocument(data) YDoc
    +onStoreDocument(data) void
    +onStateless(data) void
    +closeConnections(documentId, userId) void
  }
  class PersistenceQueue {
    +commit(documentId) CommitResult
    +loadDocument(documentId) YDoc
  }
  class FlushHandler {
    +handle(connection, message) void
  }
  class ConnectionRegistry {
    +add(userId, documentId, conn) void
    +byUser(userId, documentId) Connection[]
  }

  DocumentsService --> PermissionsService
  MembersService --> PermissionsService
  InvitationsService --> PermissionsService
  CollaborationServer --> TicketService
  CollaborationServer --> PermissionsService
  CollaborationServer --> PersistenceQueue
  CollaborationServer --> FlushHandler
  CollaborationServer --> ConnectionRegistry
  FlushHandler --> PersistenceQueue
  MembersService ..> CollaborationServer : MemberRevoked event
  DocumentsService ..> CollaborationServer : DocumentDeleted event
```

### 2.3 Permission model

| Operation                    | Owner | Editor | Viewer |
| ---------------------------- | :---: | :----: | :----: |
| View                         |  ✅   |   ✅   |   ✅   |
| Edit                         |  ✅   |   ✅   |   ❌   |
| Rename                       |  ✅   |   ❌   |   ❌   |
| Share (create invite links)  |  ✅   |   ❌   |   ❌   |
| Change roles, remove members |  ✅   |   ❌   |   ❌   |
| Delete                       |  ✅   |   ❌   |   ❌   |

One pure function backs every check, so REST and WebSocket cannot disagree:

```ts
type Role = "OWNER" | "EDITOR" | "VIEWER";
type Action =
  "view" | "edit" | "rename" | "share" | "manage_members" | "delete";

const ALLOWED: Record<Role, ReadonlySet<Action>> = {
  OWNER: new Set([
    "view",
    "edit",
    "rename",
    "share",
    "manage_members",
    "delete",
  ]),
  EDITOR: new Set(["view", "edit"]),
  VIEWER: new Set(["view"]),
};

export const can = (role: Role | null, action: Action) =>
  role !== null && ALLOWED[role].has(action);
```

`getRole(userId, documentId)` returns `OWNER` if `Document.ownerId` matches, otherwise the `DocumentMember.role`, otherwise `null`. A soft-deleted document returns `null` for everyone. **Ownership lives only in `Document.ownerId`**; `DocumentMember` rows are only `EDITOR` or `VIEWER`.

### 2.4 REST API

All routes are under `/api`. Everything except `/api/auth/*` and `/api/health*` needs a valid session.

| Method     | Path                                    | Min role | Purpose                                                                 |
| ---------- | --------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `*`        | `/api/auth/*`                           | public   | Better Auth endpoints (do not recreate)                                 |
| GET        | `/api/health`                           | public   | Liveness: **no database call** (keeps Neon asleep, used to wake Render) |
| GET        | `/api/health/ready`                     | public   | Readiness: includes a database check                                    |
| GET, PATCH | `/api/users/me`                         | session  | Profile                                                                 |
| POST       | `/api/documents`                        | session  | Create (caller becomes owner)                                           |
| GET        | `/api/documents?scope=owned\|shared&q=` | session  | List accessible documents, search by title                              |
| GET        | `/api/documents/:id`                    | viewer   | Metadata and caller's role                                              |
| PATCH      | `/api/documents/:id`                    | owner    | Rename                                                                  |
| DELETE     | `/api/documents/:id`                    | owner    | Soft delete, closes live sockets                                        |
| GET        | `/api/documents/:id/members`            | viewer   | Members (names only for non-owners)                                     |
| PATCH      | `/api/documents/:id/members/:memberId`  | owner    | Change role                                                             |
| DELETE     | `/api/documents/:id/members/:memberId`  | owner    | Remove, closes that user's sockets                                      |
| POST       | `/api/documents/:id/invitations`        | owner    | Create invite link, returns the raw token **once**                      |
| GET        | `/api/documents/:id/invitations`        | owner    | List links (never tokens)                                               |
| DELETE     | `/api/documents/:id/invitations/:invId` | owner    | Revoke                                                                  |
| POST       | `/api/invitations/accept`               | session  | `{ token }`, returns `{ documentId }`                                   |
| POST       | `/api/collaboration/tickets`            | viewer   | `{ documentId }`, returns a 60-second ticket                            |

**Rules**

- Return `404` (not `403`) for documents the caller cannot see at all, so ids do not leak.
- One error shape everywhere, with a stable `code` that the UI translates:

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "You do not have access to this document."
}
```

- Validate every body with zod (or class-validator, but not both on one route). Reject unknown fields.
- Non-owners see member **names and roles only**, not emails.
- Update `Document.updatedAt` at most once every 30 seconds per document, so a typing session does not cause a write per flush.

---

## 3. Authentication and sessions

**Design:** Better Auth runs inside `apps/api` and is the only session system. Next.js uses only its client. The browser reaches it through the Vercel rewrite, so the session cookie is first-party.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant V as Vercel rewrite
  participant A as NestJS (Better Auth)
  participant D as Postgres

  B->>V: POST /api/auth/sign-in/email
  V->>A: forward the same path
  A->>D: verify credentials, create session
  A-->>V: 200 and Set-Cookie
  V-->>B: 200 and Set-Cookie (first-party cookie)
  B->>V: GET /api/documents (cookie)
  V->>A: forward
  A->>D: resolve session, query documents
  A-->>B: document list (via Vercel)
```

**Configuration rules** (⚠ Verify each against Better Auth's current docs)

1. Mount Better Auth at `/api/auth/*` with Nest's body parser disabled for that route.
2. Set its **base URL and trusted origin to the Vercel URL**, not the Render URL, so redirects and cookies match what the browser sees.
3. Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`. Add an `Origin` check on state-changing requests.
4. Registration open to any email. **Email verification off** and **password reset hidden** unless an email provider is configured.
5. Rate-limit sign-in and sign-up.
6. Session expiry or revocation returns `401`; the client moves to the Sync error flow (keeps local edits, offers sign-in).

### 3.1 Logout with unsynced work

Deleting local data on logout can destroy offline work, and keeping it can leak data on a shared computer. Logout therefore syncs first, then asks.

```mermaid
flowchart TD
  S["User clicks Log out"] --> Q{"Unflushed work<br/>on this device?"}
  Q -->|"no"| OUT["Revoke session<br/>delete this user's local databases"]
  Q -->|"yes"| ON{"Online?"}
  ON -->|"yes"| FL["Flush each open document<br/>about 10 s timeout"]
  FL --> OK{"All confirmed?"}
  OK -->|"yes"| OUT
  OK -->|"no"| DLG["Show dialog"]
  ON -->|"no"| DLG
  DLG -->|"Stay signed in (default)"| STAY["Do nothing"]
  DLG -->|"Log out, keep changes"| KEEP["Revoke session<br/>keep local databases"]
  DLG -->|"Log out, discard changes"| DISC["Revoke session<br/>delete local databases"]
```

- **Safe by default:** discarding takes an explicit choice.
- A session **expiry** is not a logout: never purge on expiry.
- Local data is **not encrypted**. Tell people on shared computers to choose "discard", in the dialog and the README.
- Broadcast logout to other tabs through a `BroadcastChannel`.
- Delete databases by names recorded in the metadata store, because listing databases is not reliably supported (⚠ Verify). Close providers first, because deleting an open database is blocked. Retry a failed purge on the next load.

---

## 4. Database

Better Auth owns `User`, `Session`, `Account` and `Verification`. Generate them with its tooling and do not hand-write them (⚠ Verify). The tables below are ours.

```mermaid
erDiagram
  USER ||--o| USER_PROFILE : has
  USER ||--o{ DOCUMENT : owns
  USER ||--o{ DOCUMENT_MEMBER : "is member"
  USER ||--o{ DOCUMENT_INVITATION : creates
  DOCUMENT ||--o{ DOCUMENT_MEMBER : grants
  DOCUMENT ||--o{ DOCUMENT_INVITATION : has
  DOCUMENT ||--o{ DOCUMENT_UPDATE : "append-only log"
  DOCUMENT ||--o{ DOCUMENT_SNAPSHOT : "compacted state"

  USER {
    string id PK "text, owned by Better Auth"
    string email UK
    string name
  }
  USER_PROFILE {
    uuid id PK
    string userId FK
    string displayName
    string avatarUrl
    json preferences
  }
  DOCUMENT {
    uuid id PK "also the room name"
    string title
    string ownerId FK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt "soft delete"
  }
  DOCUMENT_MEMBER {
    uuid id PK
    uuid documentId FK
    string userId FK
    string role "EDITOR or VIEWER"
    datetime joinedAt
  }
  DOCUMENT_INVITATION {
    uuid id PK
    uuid documentId FK
    string tokenHash UK "SHA-256 of the raw token"
    string role "EDITOR or VIEWER"
    string createdBy FK
    string email "nullable, for future email invites"
    int maxUses "nullable"
    int useCount
    datetime expiresAt
    datetime revokedAt "nullable"
    datetime createdAt
  }
  DOCUMENT_UPDATE {
    uuid id PK
    bigint seq "identity, orders loading and compaction"
    uuid documentId FK
    bytes updateData
    int byteLength
    datetime createdAt
  }
  DOCUMENT_SNAPSHOT {
    uuid id PK
    uuid documentId FK
    bigint upToSeq "covers updates up to this seq"
    bytes snapshotData
    datetime createdAt
  }
```

**Constraints and indexes**

- `UNIQUE (documentId, userId)` on members, and `CHECK role IN ('EDITOR','VIEWER')`.
- Indexes: `Document (ownerId, updatedAt DESC)` for the dashboard, `DocumentMember (userId)` for "shared with me", `DocumentUpdate (documentId, seq)`, `DocumentSnapshot (documentId, upToSeq DESC)`. Add a `lower(title)` index only if search feels slow.
- Binary Yjs data is `bytea`, never JSON.
- Foreign keys everywhere, with cascade from `Document` to its members, invitations, updates and snapshots.
- Migrations use `DIRECT_URL`. The running app uses the pooled `DATABASE_URL` (⚠ Verify the Prisma and Neon setup).
- Prisma has no native `citext`; normalize emails (lowercase, trimmed) in the application.
- Version history and activity logs are future work. Snapshots are designed so they can be added without a redesign.

---

## 5. Collaboration server

### 5.1 Connecting and authorizing

Browsers cannot set headers on a WebSocket, so the client first obtains a ticket through the proxied REST API and presents it in the Hocuspocus auth message, never in the URL.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant A as REST API
  participant H as Hocuspocus
  participant D as Postgres

  B->>A: POST /api/collaboration/tickets (session cookie via proxy)
  A->>D: read role
  alt no access
    A-->>B: 404
  else access
    A-->>B: ticket (signed, 60 s, userId + documentId + id)
  end
  B->>H: WebSocket upgrade (Origin checked)
  B->>H: auth message (ticket, documentName)
  H->>H: verify signature, expiry, document match, single use
  H->>D: getRole(userId, documentId)
  alt role is null
    H-->>B: reject, close
  else role is VIEWER
    H-->>B: authenticated, read-only connection
  else EDITOR or OWNER
    H-->>B: authenticated, read-write
  end
  H->>D: load snapshot and updates (first connection to the room)
  H-->>B: sync (state vector exchange)
```

- **Ticket:** HMAC-signed claims `{ sub, doc, jti, exp }`, 60 seconds. Keep used `jti` values in memory until expiry (one instance, so this is enough). A ticket proves identity only. **The role is always re-read from the database.**
- The provider must fetch a **fresh ticket on every reconnect** (⚠ Verify that its `token` option accepts an async function).
- Check the `Origin` header on the upgrade against the allowed web origin.

### 5.2 Hooks

⚠ Verify every hook name and option against the pinned Hocuspocus version.

| Hook                                                     | Responsibility                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `onAuthenticate`                                         | Verify the ticket, read the role, set read-only for viewers, return `{ userId, role }` as context  |
| `onLoadDocument`                                         | Build the `Y.Doc`, set `lastCommittedSV` and `dirtySinceCommit = false`                            |
| `onChange` / document `update`                           | Set `dirtySinceCommit = true` (this also fires for delete-only edits)                              |
| `beforeHandleMessage` (if available)                     | Defense in depth: re-check the role from a short cache (about 30 s)                                |
| `onStoreDocument` (debounced, about 2 s with a 10 s max) | Call `PersistenceQueue.commit(documentId)`                                                         |
| `onStateless`                                            | Route `flush` messages to `FlushHandler`                                                           |
| `onDisconnect`                                           | Remove from the registry; Hocuspocus flushes when the last client leaves                           |
| Shutdown (`SIGTERM`)                                     | Stop accepting connections, flush every pending store, then exit (Render restarts on every deploy) |

### 5.3 Presence identity

Awareness is client-controlled, so never trust a name or color from it.

- The client publishes only `{ userId, cursor, selection }`.
- The UI resolves name and avatar from the member list (REST), and the color from a hash of `userId` into an 8-color palette. Nobody can impersonate someone else's name.
- Awareness is never persisted.

### 5.4 Revocation and deletion

```mermaid
sequenceDiagram
  autonumber
  participant O as Owner
  participant M as MembersService
  participant D as Postgres
  participant E as Event bus
  participant H as CollaborationServer
  participant V as Removed user

  O->>M: DELETE /api/documents/:id/members/:memberId
  M->>M: assertCan(owner, manage_members)
  M->>D: delete member (transaction)
  M->>E: MemberRevoked(documentId, userId)
  E->>H: handler
  H->>V: close that user's connections (code 4403)
  Note over H: role re-check blocks any straggler update
  V->>V: provider stops, UI shows access removed, local copy purged
  V->>H: reconnect attempt
  H->>D: getRole returns null
  H-->>V: rejected
```

- **Role change** (for example Editor to Viewer): close the connection and let the reconnect re-authenticate with the new role. Do not try to flip a live connection's read-only flag.
- **Document deleted:** emit `DocumentDeleted`, close all its connections with `4404`, and the client purges its local copy.
- **Policy:** a removed user's local copy is purged, and unsynced edits to that document are discarded. The UI must say so.

### 5.5 Close codes and reconnect

| Code | Meaning                            | Client action                                                          |
| ---- | ---------------------------------- | ---------------------------------------------------------------------- |
| 4401 | Unauthenticated or session expired | Refresh the session, then reconnect; if it fails, Sync error (sign in) |
| 4403 | Access revoked or forbidden        | Do not retry; Recovery pending, local copy purged                      |
| 4404 | Document missing or deleted        | Do not retry; show not found                                           |
| 1011 | Server error                       | Retry with backoff                                                     |

⚠ Verify that Hocuspocus allows custom close codes. If not, close the socket and let the next authentication fail with the right reason.

Reconnect uses exponential backoff with jitter, capped at about 30 seconds, and retries immediately on the browser's `online` event.

---

## 6. Persistence and the save acknowledgement

### 6.1 Storing and loading

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant H as Room (in memory)
  participant Q as Write queue
  participant D as Postgres

  C->>H: Yjs update
  H->>H: apply, set dirtySinceCommit
  H-->>C: broadcast to other clients
  Note over H: debounce window, or a flush message
  H->>Q: commit(documentId)
  Q->>Q: sv = state vector, diff = update since lastCommittedSV
  Q->>D: lock, INSERT DocumentUpdate, commit
  alt commit ok
    D-->>Q: committed
    Q->>H: lastCommittedSV = sv, dirty cleared if unchanged
  else commit fails
    D-->>Q: error
    Q->>H: keep lastCommittedSV, retry on next flush
  end
```

- **Load:** read the latest snapshot, then every update with `seq > upToSeq`, apply them to a fresh `Y.Doc`, then set `lastCommittedSV` to its state vector and clear `dirtySinceCommit`.
- Compute `sv` and the diff in the same synchronous step, and advance `lastCommittedSV` only **after** the commit.
- **All writes for a document go through one queue** (one at a time, and a request that arrives during a write is coalesced into one follow-up write). The same `pg_advisory_xact_lock` guards compaction, in case a deploy briefly overlaps two instances (⚠ Verify).
- Yjs updates are idempotent and commutative, so duplicate rows are harmless wasted space.
- Never write a full snapshot per keystroke. Keep Yjs garbage collection on.
- **Compaction (stretch goal):** when a room unloads with more than about 100 updates since the last snapshot, take the document lock, read the highest `seq` (call it M) **inside the lock**, merge the snapshot and updates, insert a snapshot with `upToSeq = M`, and delete updates with `seq <= M` in the same transaction.

### 6.2 The flush protocol

The editor's store hook is debounced, so a delivered message proves nothing about Postgres. The client asks explicitly and the server answers only after a commit.

```ts
// Shared message types (move to @syncspace/contracts when that package exists)
type Flush = {
  type: "flush";
  nonce: string;
  epoch: number; // client's local edit counter at send time
  stateVector: string; // base64, the client's Y state vector
};
type Flushed = { type: "flushed"; nonce: string };
type FlushFailed = {
  type: "flush-failed";
  nonce: string;
  reason: "db_unavailable" | "behind" | "too_large" | "forbidden";
};
```

**Server handling**

```mermaid
flowchart TD
  F["flush received<br/>nonce, epoch, stateVector"] --> P{"Role allows editing?"}
  P -->|"no"| X1["reply flush-failed: forbidden"]
  P -->|"yes"| SZ{"Within size limits?"}
  SZ -->|"no"| X2["reply flush-failed: too_large"]
  SZ -->|"yes"| CV{"Room already covers the<br/>client's state vector?"}
  CV -->|"no"| X3["reply flush-failed: behind"]
  CV -->|"yes"| Q["Enqueue on the document write queue"]
  Q --> D{"dirtySinceCommit?"}
  D -->|"no"| OKN["reply flushed<br/>no write needed"]
  D -->|"yes"| W["Lock, insert update, commit"]
  W --> C{"Commit ok?"}
  C -->|"yes"| OK["advance lastCommittedSV<br/>reply flushed"]
  C -->|"no"| X4["reply flush-failed: db_unavailable"]
```

**Client rules**

1. Keep only the latest outstanding `nonce`. Ignore any other reply.
2. Mark Saved only when `flushed` matches the latest nonce **and** `epoch` still equals the current epoch. If the user typed since, stay on Syncing and send another flush.
3. Send a flush at these moments:
   - after about 1.5 s of quiet (with a max wait of 5 s during continuous typing, and at most one per second)
   - right after the reconnect sync completes
   - when the tab is hidden or closing (best effort)
4. Run the reply timeout (about 15 s, with one automatic retry) **only while connected**. Disconnecting is not an error, so cancel the timer and flush again after the reconnect sync.
5. A `behind` reply means "wait and retry shortly". Other failures show Sync error with a Retry action.
6. Viewers never send flush.

**Why `dirtySinceCommit` and not "is the diff empty":** as I understand Yjs, an encoded update always carries the document's delete set, so an empty-diff check would not work. A dirty flag set by every update (deletes included) is exact. Prove this in the spike.

**What the client does not do:** it does not trust the socket being open, an update being sent, or its own IndexedDB write as proof of server persistence.

---

## 7. Frontend

### 7.1 Routes and rendering

```mermaid
flowchart TD
  ROOT["app/layout.tsx<br/>theme and query providers"]
  MKT["(marketing)/page<br/>server component"]
  AUTHG["(auth)/login, register<br/>server shell + client forms"]
  WSL["(workspace)/layout.tsx<br/>server: session gate + shell"]
  DASH["dashboard/page<br/>server shell"]
  LIST["DocumentList<br/>client, TanStack Query"]
  DOCP["documents/[documentId]/page<br/>server: metadata and role"]
  EDC["EditorClient<br/>client, dynamic import, SSR off"]
  INV["invite/page<br/>client, reads URL fragment"]
  SET["settings/page"]

  ROOT --> MKT
  ROOT --> AUTHG
  ROOT --> INV
  ROOT --> WSL
  WSL --> DASH --> LIST
  WSL --> DOCP --> EDC
  WSL --> SET
```

Client components only where interaction needs them (editor, lists, dialogs, forms). The shell, landing page and metadata stay server components. **No Next.js API routes**: the backend owns all business logic.

### 7.2 The document session

All Yjs, IndexedDB and provider logic lives in `features/document-sync/` as plain TypeScript, so it can be unit-tested without a DOM. React only receives a small interface: `status`, `pending`, `collaborators`, `retry()`.

```mermaid
flowchart LR
  subgraph SES["createDocumentSession(userId, documentId)"]
    YD["Y.Doc"]
    IDB["IndexeddbPersistence<br/>syncspace:userId:documentId"]
    PRV["HocuspocusProvider<br/>fresh ticket per connect"]
    AW["Awareness<br/>userId, cursor, selection"]
    FL["Flush controller<br/>epoch, nonce, timers"]
    PM["Pending marker<br/>in the metadata store"]
    DS["deriveStatus()"]
  end
  TT["Tiptap<br/>Collaboration + cursors"]
  HK["useDocumentSync()"]
  BG["SyncStatusBadge, OfflineBanner"]

  YD <--> IDB
  YD <--> PRV
  PRV --> AW
  YD -->|"local edit"| PM
  YD -->|"local edit"| FL
  PRV -->|"flushed / flush-failed"| FL
  FL -->|"clear marker on match"| PM
  PM --> DS
  PRV -->|"status, synced, close codes"| DS
  FL --> DS
  YD --> TT
  AW --> TT
  DS --> HK --> BG
```

- Create the session when the editor mounts. Destroy the provider, persistence and awareness when it unmounts or the user logs out.
- Never put the `Y.Doc` in React state or Zustand. Yjs is the source of truth for content.
- Viewers get a non-editable editor (`editable: false`), in addition to the server-side read-only connection.

### 7.3 Pending marker (survives refresh)

An in-memory counter cannot tell, after a refresh, whether unsynced work exists. So:

1. Keep one tiny entry per document in `syncspace:{userId}:meta`.
2. **Set it** on the first local edit, in the same handler.
3. **Clear it** only when a `flushed` reply matches the current epoch. Never on a socket event or an IndexedDB write.
4. **After every page load, treat the document as pending until a flush is confirmed in that session.** A clean document still gets `flushed` back after one round trip (the server skips the write). The worst case is a brief extra "Syncing", never a false "Saved".
5. The same store records which document databases exist and when each last fully synced, so logout can delete them by name.

### 7.4 Deriving the sync status

One pure function turns the inputs into one of eight states. It is table-testable, and it cannot reach an impossible state.

| Input           | Meaning                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `provider`      | `connected`, `connecting` or `disconnected` (the browser being offline counts as disconnected) |
| `synced`        | The initial server sync finished on this connection                                            |
| `pending`       | The pending marker is set                                                                      |
| `flushError`    | `flush-failed`, or a reply timeout while connected                                             |
| `authError`     | Closed with 4401                                                                               |
| `needsRecovery` | Closed with 4403, or a role change conflicts with pending edits                                |

```mermaid
flowchart TD
  S["Inputs changed"] --> NR{"needsRecovery?"}
  NR -->|"yes"| RP["Recovery pending"]
  NR -->|"no"| AE{"authError?"}
  AE -->|"yes"| E1["Sync error<br/>action: sign in"]
  AE -->|"no"| PV{"provider?"}
  PV -->|"disconnected"| PD{"pending?"}
  PD -->|"yes"| LS["Locally saved"]
  PD -->|"no"| OF["Offline"]
  PV -->|"connecting"| CN["Connecting"]
  PV -->|"connected"| FE{"flushError?"}
  FE -->|"yes"| E2["Sync error<br/>action: retry"]
  FE -->|"no"| SY{"synced and not pending?"}
  SY -->|"yes"| SV["Saved"]
  SY -->|"no"| SN["Syncing"]
```

Display rules on top of the function:

- **Saving locally** is a brief transient after an edit, not a guarantee. `y-indexeddb` may not report when each write completes (⚠ Verify).
- Wait **about 2 seconds** after a disconnect before showing Offline or Locally saved, so brief blips do not flash the badge. This delays the display only; the real state updates immediately.
- Every state has a text label, an icon and an `aria-live` announcement. Color is never the only signal.

### 7.5 Offline model

"Cached on this device" is not the same as "available offline".

```mermaid
flowchart TD
  Q1{"Local database exists<br/>for this user and document?"}
  Q2{"Metadata says it completed<br/>at least one full server sync?"}
  NO["Not available offline"]
  CACHE["Cached, not guaranteed"]
  OK["Available offline<br/>in an open tab"]

  Q1 -->|"no"| NO
  Q1 -->|"yes"| Q2
  Q2 -->|"no"| CACHE
  Q2 -->|"yes"| OK
```

**What the MVP promises:** keep editing in an open tab when the network drops, your edits persist locally, they survive a reload once you are back online, and they merge on reconnect.

**What it does not promise (future):** reopening a closed tab while still offline. That needs a service worker that caches the app shell, because the page's HTML and JavaScript must load without the network. It is a stretch goal; state this plainly in the README.

**Account isolation:** database names are `syncspace:{userId}:{documentId}`, and another account never opens them. Ask for persistent storage with `navigator.storage.persist()` and warn if it is not granted, because Safari may evict unused site storage (⚠ Verify).

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant C as Y.Doc
  participant I as IndexedDB
  participant H as Server
  participant D as Postgres

  Note over C,H: Online, status Saved
  C--xH: connection lost
  C->>C: after 2 s, show Offline
  U->>C: keeps typing
  C->>I: updates stored, pending marker set
  C->>C: Locally saved
  C->>H: network back, fresh ticket, reconnect
  C->>C: Connecting
  C->>H: sync (state vector exchange both ways)
  C->>C: Syncing
  C->>H: flush (nonce, epoch, state vector)
  H->>D: commit
  D-->>H: committed
  H-->>C: flushed (nonce)
  C->>C: marker cleared, Saved
```

### 7.6 State ownership

| Kind of state                             | Owner                                    |
| ----------------------------------------- | ---------------------------------------- |
| Server data (documents, members, profile) | TanStack Query                           |
| Document content                          | Yjs                                      |
| Presence                                  | Yjs awareness                            |
| Sync status                               | `deriveStatus` through `useDocumentSync` |
| UI preferences (sidebar, dialogs)         | Zustand                                  |
| Theme                                     | `next-themes`                            |
| Navigation and search text                | URL                                      |

One fact, one owner. Never copy document text into React state.

### 7.7 Editor, layout and theme rules

- **Tiptap schema allowlist:** headings, paragraphs, bold, italic, underline, strike, bullet and ordered lists, blockquote, code block, link, horizontal rule. Nothing else, and no raw HTML from paste.
- **Links:** allow only `http`, `https` and `mailto`; add `rel="noopener noreferrer"`.
- **Layout:** mobile-first; `min-h-dvh` (not `100vh`); tap targets at least 44 px; editor column about 720 px on wide screens; no horizontal page scroll at 320 px. Breakpoints are in the HLD.
- **Theme:** `next-themes` with `suppressHydrationWarning`, Light, Dark and System, semantic tokens only, no hardcoded colors. Test flash-of-wrong-theme on first paint.
- **i18n-ready:** all user-visible strings come from one messages module (English now), and the API's error `code` maps to a message there.

---

## 8. Sharing with invite links

Member-only invite links need no email provider. Everyone who joins becomes a real member, so roles, revocation and per-user storage all keep working.

```mermaid
sequenceDiagram
  autonumber
  participant O as Owner
  participant A as API
  participant D as Postgres
  participant R as Recipient

  O->>A: POST /api/documents/:id/invitations (role, expiry)
  A->>A: assertCan(owner, share), check active-link cap
  A->>D: store SHA-256 hash of a random 32-byte token
  A-->>O: raw token, shown once
  O->>R: shares https://app/invite#token (chat, message)
  R->>R: opens /invite, page reads the fragment, keeps token in sessionStorage
  R->>A: signs in or registers first if needed
  R->>A: POST /api/invitations/accept (token)
  A->>D: one transaction: lock the invite, validate, add member, increment useCount
  A-->>R: documentId
  R->>R: redirected into the document
```

**Rules**

- **Token in the URL fragment**, which browsers do not send to servers, so it stays out of Vercel and Render logs and referrer headers.
- Defaults: multi-use, 7-day expiry (options 1 and 30 days, never "no expiry"), optional use cap, Editor or Viewer only (never Owner), at most 10 active links per document.
- **Accepting never changes an existing role.** An existing member just sees "You already have access".
- Return one generic "link invalid or expired" for unknown, expired, revoked or exhausted tokens, so nobody can probe which exist.
- Revoking a link stops new joins. People who already joined stay until the owner removes them, and the UI says so.
- Rate-limit create and accept.
- A future email invitation uses the same table (`email` is already nullable).

---

## 9. Security checklist

| Area                                 | Rule                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity                             | Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) plus an `Origin` check on mutating requests (⚠ Verify Better Auth defaults)                |
| Authorization                        | `PermissionsService` on every REST handler and every WebSocket connect; role always from the database                                            |
| WebSocket                            | Single-use 60-second ticket in the auth message (not the URL), `Origin` check on upgrade, read-only viewers, re-check on a short cache           |
| Rich-text safety                     | Schema allowlist, no raw HTML paste, restricted link protocols, security headers and a CSP (⚠ Verify Tiptap's defaults)                          |
| Public-demo limits (starting values) | Max update message about 1 MB, document state about 5 MB, 50 documents per user, 20 members per document, 10 active invite links per document    |
| Rate limits (starting values)        | Sign-in and sign-up about 10 per minute per IP, tickets about 30 per minute per user, invite accept about 10 per minute per IP                   |
| Secrets                              | Only in platform settings and a local `.env`; never `NEXT_PUBLIC_*` except harmless URLs; separate dev and production values; the repo is public |
| Logging                              | Log `userId`, `documentId` and connection id; never tokens, tickets, cookies or document content                                                 |
| Demo accounts                        | Hold no real data; profile and password changes disabled; periodic reset                                                                         |
| Local data                           | Namespaced per account, purged on logout (with the unsynced-work dialog); not encrypted, and documented as such                                  |

---

## 10. Failure scenarios and tests

Each failure scenario maps to a test that must exist before the demo.

| #   | Scenario                                         | Expected behavior                                                                         | Test                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | Refresh while offline                            | Local edits intact once the page loads (full cold start needs the future app-shell cache) | Playwright, `setOffline`              |
| 2   | Offline edit, reconnect                          | Edits merge, then Saved after the flush confirms                                          | Playwright                            |
| 3   | Backend restarts mid-edit                        | Clients reconnect, resend, converge, and return to Saved                                  | Integration                           |
| 4   | Database unavailable                             | `flush-failed`; Sync error with Retry; recovers when the database returns                 | Integration (inject a Prisma failure) |
| 5   | Socket drops while typing                        | Offline or Locally saved, auto-reconnect, converge                                        | Integration                           |
| 6   | Session expires                                  | Sync error (sign in); local edits kept                                                    | Integration + Playwright              |
| 7   | Permission revoked while connected               | Connection closed, writes rejected, local copy purged                                     | Integration (two providers)           |
| 8   | Two users edit one paragraph                     | Both edits kept; documents identical                                                      | Integration (two providers)           |
| 9   | Long offline period                              | Everything delivered on reconnect                                                         | Integration                           |
| 10  | Sign out, another account signs in               | The second account cannot see the first's data                                            | Playwright                            |
| 11  | Duplicate updates                                | No corruption; documents identical                                                        | Unit                                  |
| 12  | Restart before the commit finishes               | Client never shows Saved without a matching flush; resends after reconnect                | Integration                           |
| 13  | Delete-only edit then flush                      | Not falsely Saved before the commit                                                       | Integration                           |
| 14  | Same document open in two tabs                   | Both converge; no duplicate-write problems                                                | Playwright                            |
| 15  | Invite link: expired, revoked, exhausted, reused | One generic error; no access gained                                                       | Integration                           |

```mermaid
flowchart TB
  subgraph E2E["Playwright end-to-end: few, slow"]
    E1["Two-user collaboration"]
    E2["Offline edit and reconnect"]
    E3["Account switch isolation"]
  end
  subgraph INT["Integration: real Hocuspocus, Neon ci branch"]
    I1["Two providers over WebSocket"]
    I2["Restart and database failure"]
    I3["Permissions on REST and WebSocket"]
  end
  subgraph UNIT["Unit: many, fast, no database"]
    U1["can(role, action)"]
    U2["deriveStatus table"]
    U3["flush client rules"]
    U4["Invite token and ticket logic"]
  end
  UNIT --> INT --> E2E
```

- **Vitest** runs the API unit and e2e tests, with supertest for HTTP and the Hocuspocus provider in Node for WebSocket tests. Add SWC decorator-metadata config once a service uses constructor injection (Nest relies on metadata that Vitest does not emit by default).
- **Playwright** drives the browser, using `context.setOffline(true)` for offline paths. Test Chromium and WebKit.
- Keep database-backed tests uncached in Turborepo, and give every run its own document ids.
- CI runs install, formatting, lint, typecheck, build and tests on every pull request. Integration tests use the separate Neon `ci` branch through a repository secret.

---

## 11. Configuration and deployment

### 11.1 Environment variables

| Variable               | Where        | Public? | Notes                                               |
| ---------------------- | ------------ | :-----: | --------------------------------------------------- |
| `DATABASE_URL`         | api          |   No    | Neon pooled connection string                       |
| `DIRECT_URL`           | api          |   No    | Neon direct string, migrations only                 |
| `BETTER_AUTH_SECRET`   | api          |   No    | Random; different per environment                   |
| `BETTER_AUTH_URL`      | api          |   No    | **The Vercel app URL**, not Render's                |
| `WEB_ORIGIN`           | api          |   No    | Allowed `Origin` for REST and the WebSocket upgrade |
| `COLLAB_TICKET_SECRET` | api          |   No    | Signs WebSocket tickets                             |
| `PORT`                 | api          |   No    | Set by Render; default 4000                         |
| `API_URL`              | web (server) |   No    | Render URL, used only by the rewrite                |
| `NEXT_PUBLIC_WS_URL`   | web          |   Yes   | Render's WebSocket URL (a URL, not a secret)        |

Validate all of them with zod when the API starts, so a missing secret fails fast.

### 11.2 Deploy steps

1. **Neon:** create one project. Use `main` for production only, plus one `dev-<name>` branch per developer and a `ci` branch. Never use production locally.
2. **Render (free web service):** root directory `apps/api`. Build with Corepack and Yarn, generate the Prisma client, build Nest, and run `prisma migrate deploy` (as a build or pre-deploy step; ⚠ Verify what the free plan supports). Start with `node dist/main.js`. Set `HUSKY=0`.
3. **Vercel:** root directory `apps/web`, install from the repo root, set `HUSKY=0`. Add the rewrite below.
4. **Prove the skeleton early** (before feature work): sign in, refresh, call the ticket endpoint, open a WebSocket to Render, and time a cold start, in Chrome **and** Safari.

```ts
// apps/web/next.config.ts (shape only; ⚠ Verify the current syntax)
async rewrites() {
  return [
    { source: "/api/:path*", destination: `${process.env.API_URL}/api/:path*` },
  ];
}
```

### 11.3 Operations

- **Wake-up:** the web app calls `GET /api/health` when it loads, so Render starts waking before the user needs it. Warm Render and Neon a minute before any demo.
- **Graceful shutdown:** on `SIGTERM`, flush all pending stores before exit.
- **Logs:** structured, one line per event, with `documentId` and connection id. Count connections, flush successes, flush failures and reconnects in log lines.
- **Backups:** the free tier is not a backup plan. Document a manual, encrypted `pg_dump` command, and never commit dumps or upload them as public artifacts.

---

## 12. Early spikes (pass or fail)

Do these before building features on top of them.

| #   | Spike                                                                                                            | Day    |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Better Auth inside Nest and behind the Vercel rewrite: cookie set, session survives refresh in Chrome and Safari | 1      |
| 2   | A cold Render through the rewrite: does the first request complete within Vercel's limit (⚠ Verify)?             | 1 to 2 |
| 3   | Hocuspocus on the Nest server, ticket authentication, custom close codes, read-only connections                  | 3      |
| 4   | Message order on one connection, including a delete followed immediately by a flush                              | 3      |
| 5   | A flush replies `flushed` only after the commit; killing the server before the commit never ends in Saved        | 3 to 4 |
| 6   | A clean document replies `flushed` without writing                                                               | 4      |
| 7   | Two clients typing at once never produce a false Saved (compare full document states)                            | 4      |
| 8   | `y-indexeddb`: observe updates for the pending marker; delete a database after closing the provider              | 4      |
| 9   | Delete-only edits set `dirtySinceCommit` and are committed                                                       | 4      |

**Fallback if message ordering cannot be relied on:** have the client send the flush only after the server acknowledges its latest update (⚠ Verify that Hocuspocus exposes such an acknowledgement).
