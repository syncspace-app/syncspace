# SyncSpace: Requirements & User Stories

> **Status:** v2.0 · **Updated:** 2026-11-25 · **Audience:** both developers building the MVP.
> **Source documents:** [project-brief.md](project-brief.md) · [architecture-hld.md](architecture-hld.md) · [architecture-lld.md](architecture-lld.md)
> **Next:** [High-level architecture](architecture-hld.md) for system design · [Low-level design](architecture-lld.md) for modules, protocols and tests.

## Reading notes

- Stories are grouped by epic. Each epic maps to one or more delivery days from the 14-day plan.
- **P0** = must ship · **P1** = should ship · **P2** = ship if time allows.
- **Never cut** stories are marked ⛔ — they are non-negotiable regardless of time pressure.
- Each story has a unique id (`US-NNN`) and each criterion has a unique id (`AC-NNN-NN`) so they can be referenced in pull requests and test files.
- Acceptance criteria are split into **Backend (BE)** and **Frontend (FE)** sections so each developer has an unambiguous checklist.
- **Definition of Done (DoD)** at the story level lists the minimum automated tests that must exist before the story is closed.
- Day references align with the [14-day delivery plan](#appendix-a--story-map-day-order).

---

## Contents

1. [Epic 1 — Authentication & Sessions](#epic-1--authentication--sessions)
2. [Epic 2 — Dashboard & Document Management](#epic-2--dashboard--document-management)
3. [Epic 3 — Rich-Text Editor](#epic-3--rich-text-editor)
4. [Epic 4 — Real-Time Collaboration](#epic-4--real-time-collaboration)
5. [Epic 5 — Offline-First & Sync](#epic-5--offline-first--sync)
6. [Epic 6 — Sync Status](#epic-6--sync-status)
7. [Epic 7 — Durable Persistence & Recovery](#epic-7--durable-persistence--recovery)
8. [Epic 8 — Sharing & Permissions](#epic-8--sharing--permissions)
9. [Epic 9 — Email (Optional)](#epic-9--email-optional)
10. [Epic 10 — UI, Accessibility & Theme](#epic-10--ui-accessibility--theme)
11. [Epic 11 — Infrastructure, Ops & Security](#epic-11--infrastructure-ops--security)
12. [Epic 12 — Testing & CI](#epic-12--testing--ci)
13. [Appendix A — Story Map (Day Order)](#appendix-a--story-map-day-order)
14. [Appendix B — Non-Negotiable Stories](#appendix-b--non-negotiable-stories)

---

## Epic 1 — Authentication & Sessions

> **Days:** 1–2 · **All stories P0**

---

### US-001 · Register with email and password · P0 · Days 1–2

**As a** new visitor,
**I want to** create an account with my email and password,
**so that** I can access SyncSpace with a persistent identity.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| AC-001-BE-01 | `POST /api/auth/sign-up/email` accepts `{ name, email, password }` and is handled entirely by Better Auth; do not recreate the endpoint |
| AC-001-BE-02 | Password is hashed by Better Auth; plain-text passwords are never stored or logged                                                      |
| AC-001-BE-03 | Duplicate email returns HTTP 422 with `{ code: "EMAIL_TAKEN", message: "..." }`                                                         |
| AC-001-BE-04 | Successful registration creates a session and sets an `HttpOnly Secure SameSite=Lax` cookie                                             |
| AC-001-BE-05 | Account is active immediately; Better Auth's email-verification feature is left disabled in the MVP                                     |
| AC-001-BE-06 | Registration is rate-limited to 10 attempts per minute per IP; exceeding the limit returns HTTP 429 with a `Retry-After` header         |
| AC-001-BE-07 | The endpoint is reachable through the Vercel `/api` rewrite; the Better Auth base URL is set to the Vercel origin                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| AC-001-FE-01 | Registration page lives at `/register` and contains fields for display name, email and password                                |
| AC-001-FE-02 | Password field has a show/hide toggle                                                                                          |
| AC-001-FE-03 | Each field has an associated `<label>`; errors are rendered beneath the field they relate to                                   |
| AC-001-FE-04 | Inline error "An account with this email already exists" is shown for a duplicate-email response                               |
| AC-001-FE-05 | Inline error "Password must be at least 8 characters" is shown for a short password before the form is submitted               |
| AC-001-FE-06 | The submit button shows a loading spinner while the request is in-flight and is disabled to prevent double-submit              |
| AC-001-FE-07 | On success the user is redirected to `/dashboard`                                                                              |
| AC-001-FE-08 | All form errors are announced via an `aria-live="polite"` region; all controls are keyboard-reachable with visible focus rings |

**Definition of Done**

- [ ] `POST /api/auth/sign-up/email` works through the Vercel rewrite in Chrome and Safari
- [ ] BE integration test: duplicate email → 422; rate limit exceeded → 429
- [ ] FE unit test: inline password-length validation fires before submit
- [ ] Playwright test: register → redirected to `/dashboard` → refresh → still signed in

---

### US-002 · Sign in with email and password · P0 · Days 1–2

**As a** returning user,
**I want to** sign in with my email and password,
**so that** I can access my documents.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AC-002-BE-01 | `POST /api/auth/sign-in/email` is handled by Better Auth; do not recreate the endpoint                                     |
| AC-002-BE-02 | Wrong credentials return HTTP 401 with `{ code: "INVALID_CREDENTIALS" }`; the response never confirms which field is wrong |
| AC-002-BE-03 | Successful sign-in sets the session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`)                                          |
| AC-002-BE-04 | Sign-in is rate-limited to 10 attempts per minute per IP; exceeding returns HTTP 429                                       |
| AC-002-BE-05 | The session cookie is accessible to subsequent same-origin API calls through the Vercel rewrite                            |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| AC-002-FE-01 | Sign-in page lives at `/login` and contains fields for email and password                                        |
| AC-002-FE-02 | A single non-specific error "Incorrect email or password" is shown on 401; individual field errors are not shown |
| AC-002-FE-03 | On success the user is redirected to the URL stored in `?redirect=` or to `/dashboard` if none                   |
| AC-002-FE-04 | Visiting any protected route while unauthenticated redirects to `/login?redirect=<original-path>`                |
| AC-002-FE-05 | The submit button is disabled while the request is in-flight                                                     |

**Definition of Done**

- [ ] `POST /api/auth/sign-in/email` works through the Vercel rewrite in Chrome and Safari
- [ ] BE integration test: wrong password → 401; rate limit → 429
- [ ] Playwright test: sign in → redirected to dashboard; visit protected route → redirected to login with redirect param preserved

---

### US-003 · Persistent session across page refresh · P0 · Days 1–2

**As a** signed-in user,
**I want** my session to survive a page refresh or closing and reopening the tab,
**so that** I do not have to sign in repeatedly.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| AC-003-BE-01 | The session cookie has a long enough `Max-Age` or `Expires` that a typical browser session persists for at least 7 days |
| AC-003-BE-02 | Any authenticated endpoint validates the session on every request; it never trusts a stale in-memory state              |
| AC-003-BE-03 | A session that is revoked (by sign-out) returns HTTP 401 immediately on the next request                                |
| AC-003-BE-04 | Session expiry returns HTTP 401 with `{ code: "SESSION_EXPIRED" }`                                                      |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| AC-003-FE-01 | On page load a session check is performed; if valid the user lands on the requested page                 |
| AC-003-FE-02 | A 401 with `code: "SESSION_EXPIRED"` redirects to `/login` without deleting local document data          |
| AC-003-FE-03 | The session check result is cached by TanStack Query so the UI does not flash a logged-out state on load |

**Definition of Done**

- [ ] Spike (Day 1): Better Auth cookie survives a full browser refresh through the Vercel rewrite in Chrome and Safari
- [ ] Playwright test: sign in → close tab → reopen → still on dashboard

---

### US-004 · Sign out · P0 · Days 1–2

**As a** signed-in user,
**I want to** sign out,
**so that** my session is ended and my data is protected on shared devices.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------- |
| AC-004-BE-01 | `POST /api/auth/sign-out` is handled by Better Auth and immediately revokes the session server-side |
| AC-004-BE-02 | After sign-out any request using the old session cookie returns HTTP 401                            |
| AC-004-BE-03 | The response clears the session cookie (`Max-Age=0`)                                                |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| AC-004-FE-01 | Clicking "Sign out" triggers the unsynced-work check (US-005) before calling the sign-out endpoint |
| AC-004-FE-02 | After the sign-out response, the user is redirected to `/login`                                    |
| AC-004-FE-03 | A `BroadcastChannel` message is posted so other open tabs also redirect to `/login`                |
| AC-004-FE-04 | Per-user local IndexedDB databases are deleted after sign-out (see US-005 for the choice dialog)   |
| AC-004-FE-05 | Visiting any protected route after sign-out redirects to `/login`                                  |

**Definition of Done**

- [ ] BE integration test: session token is invalid after sign-out → 401
- [ ] Playwright test: sign out → protected route → redirected to login; second tab also redirects

---

### US-005 · Sign out with unsynced work · P0 · Days 8–9

**As a** signed-in user with unsynced local edits,
**I want to** be warned before those edits are discarded on sign-out,
**so that** I do not accidentally lose work.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-005-BE-01 | The sign-out endpoint accepts an optional `{ flushFirst: true }` body; if present it waits up to 10 seconds for any in-progress flush to complete before revoking the session |
| AC-005-BE-02 | If `flushFirst` is false or absent, the session is revoked immediately regardless of pending state                                                                            |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-005-FE-01 | If the pending marker is not set for any open document, sign-out proceeds immediately without a dialog                                                                                               |
| AC-005-FE-02 | If the pending marker is set and the device is online, the client attempts to flush all open documents with a 10-second timeout                                                                      |
| AC-005-FE-03 | If all flushes succeed, sign-out proceeds without a dialog                                                                                                                                           |
| AC-005-FE-04 | If any flush fails or the device is offline, a dialog appears with three options: **Stay signed in** (default focus), **Sign out and keep changes on this device**, **Sign out and discard changes** |
| AC-005-FE-05 | "Stay signed in" closes the dialog and does nothing further                                                                                                                                          |
| AC-005-FE-06 | "Sign out and keep changes" calls the sign-out endpoint and leaves local databases intact                                                                                                            |
| AC-005-FE-07 | "Sign out and discard changes" calls the sign-out endpoint and then deletes all local databases for this user                                                                                        |
| AC-005-FE-08 | "Sign out and discard changes" uses destructive button styling and is not the default focused element                                                                                                |
| AC-005-FE-09 | The dialog body reads: "You have unsaved changes. If you discard them they cannot be recovered."                                                                                                     |

**Definition of Done**

- [ ] Playwright test: edit → go offline → click sign-out → dialog appears → "Stay signed in" closes dialog; "Keep changes" signs out with data intact; "Discard" signs out and deletes local data

---

### US-006 · View and update profile · P0 · Days 2–3

**As a** signed-in user,
**I want to** view and update my display name,
**so that** collaborators see my correct name.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-006-BE-01 | `GET /api/users/me` returns `{ id, email, displayName, avatarUrl, preferences }` for the authenticated user                                          |
| AC-006-BE-02 | `PATCH /api/users/me` accepts `{ displayName }` and returns the updated profile                                                                      |
| AC-006-BE-03 | `displayName` must be 1–60 characters; values outside this range return HTTP 422 with `{ code: "VALIDATION_ERROR", fields: { displayName: "..." } }` |
| AC-006-BE-04 | Email is read-only; a `PATCH` body that includes `email` is silently ignored                                                                         |
| AC-006-BE-05 | Both endpoints require a valid session; unauthenticated requests return 401                                                                          |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-006-FE-01 | The settings page at `/settings` shows the current display name and email (email read-only)                                                |
| AC-006-FE-02 | Editing the display name field and saving calls `PATCH /api/users/me`                                                                      |
| AC-006-FE-03 | An inline error is shown if the name is empty or exceeds 60 characters before the form is submitted                                        |
| AC-006-FE-04 | A success toast "Profile updated" is shown after a successful save                                                                         |
| AC-006-FE-05 | The updated display name is reflected in the presence strip of any open document without a page reload (TanStack Query cache invalidation) |

**Definition of Done**

- [ ] BE integration test: PATCH → GET returns updated value; name > 60 chars → 422
- [ ] Playwright test: change display name → visible in collaboration presence panel

---

## Epic 2 — Dashboard & Document Management

> **Days:** 3–4 · **All stories P0**

---

### US-007 · Create a new document · P0 · Days 3–4

**As a** signed-in user,
**I want to** create a new document,
**so that** I have a place to write.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| AC-007-BE-01 | `POST /api/documents` accepts an optional `{ title }` body; if omitted the title defaults to "Untitled document" |
| AC-007-BE-02 | The authenticated user is set as owner; `Document.ownerId` is their user id                                      |
| AC-007-BE-03 | Returns HTTP 201 with `{ id, title, ownerId, createdAt, updatedAt }`                                             |
| AC-007-BE-04 | A user may own at most 50 documents; creating a 51st returns HTTP 422 with `{ code: "DOCUMENT_LIMIT_REACHED" }`  |
| AC-007-BE-05 | Requires a valid session; unauthenticated returns 401                                                            |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| AC-007-FE-01 | A "New document" button is prominently available on the dashboard                                                   |
| AC-007-FE-02 | Clicking it calls `POST /api/documents` and immediately redirects to `/documents/<id>` on success                   |
| AC-007-FE-03 | A loading state is shown on the button while the request is in-flight                                               |
| AC-007-FE-04 | If the 50-document limit is reached, a toast error "You have reached the maximum number of documents (50)" is shown |
| AC-007-FE-05 | The new document appears in the "My documents" list when the user navigates back to the dashboard                   |

**Definition of Done**

- [ ] BE integration test: POST → 201; 51st document → 422
- [ ] Playwright test: create → editor opens at correct URL → document visible in dashboard list

---

### US-008 · List owned and shared documents · P0 · Days 3–4

**As a** signed-in user,
**I want to** see all my documents in one place,
**so that** I can navigate to any of them quickly.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC-008-BE-01 | `GET /api/documents?scope=owned` returns only documents where `Document.ownerId` equals the caller's id and `deletedAt` is null          |
| AC-008-BE-02 | `GET /api/documents?scope=shared` returns only documents where the caller has a `DocumentMember` row (not owner) and `deletedAt` is null |
| AC-008-BE-03 | Each item includes `{ id, title, updatedAt, ownerName, callerRole }`                                                                     |
| AC-008-BE-04 | Results are sorted by `updatedAt` descending                                                                                             |
| AC-008-BE-05 | Soft-deleted documents (`deletedAt` is not null) never appear                                                                            |
| AC-008-BE-06 | Requires a valid session; unauthenticated returns 401                                                                                    |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| AC-008-FE-01 | The dashboard at `/dashboard` shows two tabs or sections: "My documents" and "Shared with me"                      |
| AC-008-FE-02 | Each document card shows title, last-updated timestamp and the caller's role badge                                 |
| AC-008-FE-03 | "Shared with me" cards also show the owner's display name                                                          |
| AC-008-FE-04 | An empty-state illustration and message are shown when a section has no documents                                  |
| AC-008-FE-05 | A skeleton loading state is shown while the list is fetching                                                       |
| AC-008-FE-06 | TanStack Query is used for data fetching; the cache is invalidated after a document is created, renamed or deleted |

**Definition of Done**

- [ ] BE integration test: scope=owned excludes shared docs; scope=shared excludes owned docs; deleted docs excluded from both
- [ ] Playwright test: create document → visible in owned list; accept invite → visible in shared list

---

### US-009 · Search documents by title · P0 · Days 3–4

**As a** signed-in user,
**I want to** search my documents by title,
**so that** I can find a specific document quickly.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| AC-009-BE-01 | `GET /api/documents?q=<term>` performs a case-insensitive title search across all accessible documents (owned and shared) |
| AC-009-BE-02 | Search is scoped strictly to the caller's accessible documents; no cross-user results                                     |
| AC-009-BE-03 | An empty or absent `q` parameter returns all accessible documents                                                         |
| AC-009-BE-04 | Soft-deleted documents are excluded from search results                                                                   |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| AC-009-FE-01 | A search input is available on the dashboard                                                   |
| AC-009-FE-02 | Input is debounced by 300 ms before the API is called                                          |
| AC-009-FE-03 | A loading indicator is shown while the search request is in-flight                             |
| AC-009-FE-04 | An empty-result message "No documents match your search" is shown when no results are returned |
| AC-009-FE-05 | Clearing the search input returns the full list                                                |

**Definition of Done**

- [ ] BE integration test: search returns only matching docs; cross-user docs excluded
- [ ] FE unit test: debounce fires after 300 ms, not on every keystroke

---

### US-010 · Rename a document · P0 · Days 3–4

**As a** document owner,
**I want to** rename a document,
**so that** it has a meaningful title.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| AC-010-BE-01 | `PATCH /api/documents/:id` accepts `{ title }` and updates the document title                                 |
| AC-010-BE-02 | Only the owner may rename; editors and viewers receive HTTP 403 with `{ code: "FORBIDDEN" }`                  |
| AC-010-BE-03 | Title must be 1–255 characters; values outside this range return HTTP 422 with `{ code: "VALIDATION_ERROR" }` |
| AC-010-BE-04 | Returns 404 (not 403) for documents the caller cannot see, so document existence is not leaked                |
| AC-010-BE-05 | `Document.updatedAt` is updated on a successful rename                                                        |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| AC-010-FE-01 | The document title is editable inline at the top of the editor                            |
| AC-010-FE-02 | The PATCH is called 500 ms after the user stops typing in the title field                 |
| AC-010-FE-03 | The dashboard list reflects the new title without a full page reload (cache invalidation) |
| AC-010-FE-04 | The browser tab title updates to match the new document title                             |
| AC-010-FE-05 | The title field is hidden or read-only for editors and viewers                            |

**Definition of Done**

- [ ] BE integration test: owner renames → 200; editor renames → 403; title > 255 chars → 422
- [ ] Playwright test: rename in editor → new title visible in dashboard list and browser tab

---

### US-011 · Delete a document · P0 · Days 3–4

**As a** document owner,
**I want to** delete a document,
**so that** it is removed from my workspace.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| AC-011-BE-01 | `DELETE /api/documents/:id` sets `Document.deletedAt` to the current timestamp (soft delete)                           |
| AC-011-BE-02 | Only the owner may delete; others receive HTTP 403 with `{ code: "FORBIDDEN" }`                                        |
| AC-011-BE-03 | Deletion emits a `DocumentDeleted` event that closes all live WebSocket connections for that room with close code 4404 |
| AC-011-BE-04 | Subsequent `GET /api/documents/:id` for a deleted document returns HTTP 404                                            |
| AC-011-BE-05 | Returns 404 (not 403) for documents the caller cannot see                                                              |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-011-FE-01 | A delete option is available in the document's context menu on the dashboard and in the editor header                                                                |
| AC-011-FE-02 | Clicking delete shows a confirmation dialog: "Delete this document? This action cannot be undone."                                                                   |
| AC-011-FE-03 | The dialog has two buttons: **Cancel** (default focus) and **Delete** (destructive styling)                                                                          |
| AC-011-FE-04 | On confirmation the DELETE request is called; on success the document is removed from the list and the user is redirected to `/dashboard` if currently in the editor |
| AC-011-FE-05 | Clients connected to the deleted document's room receive a close event (4404) and are shown a "Document deleted" notice, then redirected to `/dashboard`             |

**Definition of Done**

- [ ] BE integration test: DELETE → 200; subsequent GET → 404; connected clients receive 4404
- [ ] Playwright test: delete → document absent from dashboard; second connected client redirected

---

## Epic 3 — Rich-Text Editor

> **Days:** 4–5 · **All stories P0**

---

### US-012 · Write and format rich text · P0 · Days 4–5

**As a** user with edit access,
**I want to** write and format rich text using common controls,
**so that** my documents are well structured.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-012-BE-01 | The Tiptap schema allowlist is enforced server-side: Hocuspocus rejects any Yjs update that introduces node types outside the allowed set                                          |
| AC-012-BE-02 | Link `href` values are validated on the server; only `http`, `https` and `mailto` schemes are accepted; updates with other schemes are rejected                                    |
| AC-012-BE-03 | Viewer role connections are set to read-only in `onAuthenticate`; any editor-type Yjs update received on a read-only connection is rejected and the connection is closed with 1008 |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-012-FE-01 | The editor supports: H1, H2, H3, paragraph, bold, italic, underline, strikethrough, bullet list, numbered list, blockquote, code block, horizontal rule and links |
| AC-012-FE-02 | A toolbar exposes all supported formats; active marks are visually highlighted with a distinct background                                                         |
| AC-012-FE-03 | Keyboard shortcuts work: `Ctrl/Cmd+B` bold, `Ctrl/Cmd+I` italic, `Ctrl/Cmd+U` underline, `Ctrl/Cmd+Shift+S` strikethrough                                         |
| AC-012-FE-04 | Link insertion dialog restricts input to `http`, `https` and `mailto`; other schemes are stripped before the link is applied                                      |
| AC-012-FE-05 | Pasted HTML is sanitised to the allowed Tiptap schema; raw `<script>` tags and inline event handlers are stripped                                                 |
| AC-012-FE-06 | The editor content column is capped at approximately 720 px on wide screens with centered alignment                                                               |
| AC-012-FE-07 | For viewer role the editor is set to `editable: false`; the toolbar is hidden; the document is visually presented as read-only                                    |
| AC-012-FE-08 | The document title field sits above the editor and is editable inline (triggers US-010)                                                                           |
| AC-012-FE-09 | The editor is loaded with dynamic import and `ssr: false` to avoid hydration errors                                                                               |

**Definition of Done**

- [ ] BE integration test: viewer submits Yjs editor update → connection closed 1008
- [ ] FE unit test: paste sanitization strips disallowed HTML and `<script>` tags
- [ ] Manual test: each format applied and keyboard shortcuts verified
- [ ] Playwright test: viewer cannot type; editor sees all toolbar options

---

### US-013 · Responsive editor layout · P0 · Days 4, 12

**As a** user on any screen size,
**I want** the editor to be usable on mobile, tablet and desktop,
**so that** I can write anywhere.

#### Backend Acceptance Criteria

| #            | Criteria                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| AC-013-BE-01 | No backend criteria for this story; layout is entirely a frontend concern |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| AC-013-FE-01 | At ≤ 639 px: toolbar is docked to the bottom, horizontally scrollable, and does not overflow the viewport |
| AC-013-FE-02 | At ≤ 639 px: the editor is full-screen; the sidebar is hidden; the page has no horizontal scroll          |
| AC-013-FE-03 | At 640–1023 px: toolbar is condensed (icon-only); sidebar collapses behind a toggle                       |
| AC-013-FE-04 | At ≥ 1024 px: full labeled toolbar; persistent sidebar; sync status badge in the header                   |
| AC-013-FE-05 | All toolbar buttons have a minimum touch target of 44 × 44 px                                             |
| AC-013-FE-06 | `min-h-dvh` is used instead of `min-h-screen` to handle mobile browser chrome                             |
| AC-013-FE-07 | Layout is verified at 320, 375, 768, 1024 and 1440 px viewport widths                                     |

**Definition of Done**

- [ ] Playwright test at all five viewports: no horizontal scroll, all buttons reachable, touch targets ≥ 44 px

---

## Epic 4 — Real-Time Collaboration

> **Days:** 5–7 · **All stories P0**

---

### US-014 · Connect to a document room · P0 · Days 5–6

**As a** user with access to a document,
**I want** my editor to connect to the live room,
**so that** I can collaborate in real time.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-014-BE-01 | `POST /api/collaboration/tickets` requires a valid session and body `{ documentId }`                                                                        |
| AC-014-BE-02 | Returns HTTP 404 (not 403) if the user has no access to the document                                                                                        |
| AC-014-BE-03 | Returns `{ ticket }` where the ticket is an HMAC-signed string with claims `{ sub, doc, jti, exp }` and a 60-second expiry                                  |
| AC-014-BE-04 | Each `jti` is single-use; a replayed ticket returns HTTP 401 on the WebSocket auth step                                                                     |
| AC-014-BE-05 | The WebSocket upgrade checks the `Origin` header against `WEB_ORIGIN`; mismatches are rejected with HTTP 403                                                |
| AC-014-BE-06 | `onAuthenticate` verifies the ticket signature and expiry, reads the user's role from the database, and stores `{ userId, role }` in the connection context |
| AC-014-BE-07 | A user with no access (role is null) is rejected with close code 4403                                                                                       |
| AC-014-BE-08 | Ticket endpoint is rate-limited to 30 requests per minute per user                                                                                          |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| AC-014-FE-01 | On editor mount the client calls `POST /api/collaboration/tickets` before opening the WebSocket                  |
| AC-014-FE-02 | The ticket is sent in the Hocuspocus auth message; it is never placed in the WebSocket URL                       |
| AC-014-FE-03 | The HocuspocusProvider `token` option accepts an async function so a fresh ticket is obtained on every reconnect |
| AC-014-FE-04 | While the ticket is being fetched and the WebSocket is connecting the status badge shows **Connecting**          |
| AC-014-FE-05 | A 4403 close stops reconnect attempts and shows the removal dialog (see US-031)                                  |
| AC-014-FE-06 | A 4404 close stops reconnect attempts and shows "This document no longer exists" with a link to the dashboard    |

**Definition of Done**

- [ ] Spike (Day 2): ticket flow works end-to-end on live hosts
- [ ] BE integration test: expired ticket → rejected; valid ticket → connected; replayed ticket → 4403
- [ ] BE integration test: no-access user → 4403
- [ ] Playwright test: open editor → WebSocket connected → status badge not in error state

---

### US-015 · Co-edit a document in real time · P0 · Days 5–7

**As a** user editing a shared document,
**I want** my changes to appear on collaborators' screens in near real time,
**so that** we can work together without conflicts.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AC-015-BE-01 | Hocuspocus broadcasts each Yjs update to all other connections in the same room on the same process                        |
| AC-015-BE-02 | Concurrent updates from two clients are merged by Yjs; the server never discards a valid update                            |
| AC-015-BE-03 | Applying the same Yjs update twice produces no additional change to the document state                                     |
| AC-015-BE-04 | Any Yjs editor update received on a viewer (read-only) connection is rejected and that connection is closed with code 1008 |
| AC-015-BE-05 | Hocuspocus `onChange` sets `dirtySinceCommit = true` on the room; this fires for delete-only edits as well as inserts      |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| AC-015-FE-01 | The Tiptap editor uses the Collaboration extension backed by the shared `Y.Doc`                                                  |
| AC-015-FE-02 | Changes typed by the local user are applied to the `Y.Doc` immediately (optimistic) and broadcast through the HocuspocusProvider |
| AC-015-FE-03 | Updates received from the provider are applied to the editor without a full re-render                                            |
| AC-015-FE-04 | Two clients typing concurrently produce a deterministic, identical result on both screens                                        |
| AC-015-FE-05 | No user's edit is silently dropped during concurrent editing                                                                     |

**Definition of Done**

- [ ] BE integration test: two Node providers type concurrently → both document states identical after sync
- [ ] BE integration test: viewer sends editor update → connection closed 1008
- [ ] Playwright test: two-browser session; User A types → User B sees text within 1 second

---

### US-016 · See collaborator presence · P0 · Days 6–7

**As a** user editing a shared document,
**I want to** see who else is currently in the document and where their cursor is,
**so that** I can coordinate without stepping on each other.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-016-BE-01 | Hocuspocus relays Yjs Awareness updates between all connections in a room                                                                                                                                     |
| AC-016-BE-02 | Awareness data is never persisted to the database                                                                                                                                                             |
| AC-016-BE-03 | The server does not trust names or colors from awareness; it resolves the display name from the `UserProfile` on `onAuthenticate` and stores it in the connection context for use in server-side logging only |
| AC-016-BE-04 | When a client disconnects, Hocuspocus removes their awareness entry; other clients receive the removal within 5 seconds                                                                                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| AC-016-FE-01 | Each connected user is shown in a presence strip (avatar initials, display name) in the editor header               |
| AC-016-FE-02 | Each user's cursor position is rendered in the document body using the Tiptap CollaborationCursor extension         |
| AC-016-FE-03 | Each user's text selection is highlighted in their assigned color                                                   |
| AC-016-FE-04 | Display names are read from the member list fetched via REST, not from Yjs awareness directly                       |
| AC-016-FE-05 | Colors are assigned deterministically by hashing `userId` into an 8-color palette; a user always has the same color |
| AC-016-FE-06 | A user who disconnects is removed from the presence strip within 5 seconds                                          |
| AC-016-FE-07 | Awareness updates are throttled to prevent flooding (starting value: at most one cursor update per 50 ms)           |

**Definition of Done**

- [ ] Playwright test: User A opens document → User B joins → A sees B's name in presence strip and B's cursor moves as B types

---

## Epic 5 — Offline-First & Sync

> **Days:** 8–9 · **All stories P0**

---

### US-017 · Keep editing when the network drops · P0 · Days 8–9

**As a** user whose network connection drops while the editor is open,
**I want to** keep typing without interruption,
**so that** I do not lose my train of thought.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| AC-017-BE-01 | When a client disconnects mid-session, the room remains in memory and its `dirtySinceCommit` flag is preserved |
| AC-017-BE-02 | The server does not treat a disconnected client as an error; no error is logged for a normal close             |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| AC-017-FE-01 | When the WebSocket disconnects the Tiptap editor remains fully interactive (`editable` stays true for editor/owner) |
| AC-017-FE-02 | Every local edit is written to IndexedDB by y-indexeddb in the background                                           |
| AC-017-FE-03 | The first local edit after the last confirmed flush sets the pending marker in `syncspace:{userId}:meta`            |
| AC-017-FE-04 | The status badge shows **Locally saved** after a 2-second debounce once disconnected and the pending marker is set  |
| AC-017-FE-05 | The status badge shows **Offline** after the same 2-second debounce if the pending marker is not set                |
| AC-017-FE-06 | The 2-second debounce prevents brief blips from flashing the badge                                                  |
| AC-017-FE-07 | No error dialog or destructive prompt is shown to the user solely because of a disconnect                           |

**Definition of Done**

- [ ] Playwright test: `context.setOffline(true)` → type → badge shows "Locally saved" after 2 s
- [ ] FE integration test: pending marker is set on first edit after disconnect; not set before

---

### US-018 · Auto-reconnect and sync after a network drop · P0 · Days 8–9

**As a** user whose connection has recovered,
**I want** the app to reconnect and merge my offline edits automatically,
**so that** I do not have to do anything manual.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| AC-018-BE-01 | On reconnect the server performs a Yjs state vector exchange; it sends only the updates the client is missing       |
| AC-018-BE-02 | The server accepts the client's pending updates and merges them into the room's `Y.Doc`                             |
| AC-018-BE-03 | After a successful reconnect sync the room's `dirtySinceCommit` flag reflects whether any uncommitted changes exist |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| AC-018-FE-01 | The HocuspocusProvider retries the connection with exponential backoff and jitter, capped at 30 seconds |
| AC-018-FE-02 | A retry fires immediately when the browser fires the `online` event                                     |
| AC-018-FE-03 | A fresh ticket is fetched before each reconnect attempt                                                 |
| AC-018-FE-04 | While reconnecting the status badge shows **Connecting**                                                |
| AC-018-FE-05 | Once the socket is open and the state vector exchange completes the status badge shows **Syncing**      |
| AC-018-FE-06 | After the `flushed` reply the status badge shows **Saved**                                              |
| AC-018-FE-07 | The document state on all replicas is identical after reconciliation; no edit is silently lost          |

**Definition of Done**

- [ ] Playwright test: `setOffline(true)` → type → `setOffline(false)` → badge reaches "Saved"; document content identical on both clients
- [ ] BE integration test: disconnect provider → type → reconnect → both providers identical

---

### US-019 · Persist document state locally · P0 · Days 8–9

**As a** user who has previously opened a document while online,
**I want** the document content to be available locally,
**so that** I can keep editing if my connection drops.

#### Backend Acceptance Criteria

| #            | Criteria                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| AC-019-BE-01 | No backend criteria for local persistence; y-indexeddb is entirely a frontend concern |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-019-FE-01 | y-indexeddb persists each document's `Y.Doc` under the key `syncspace:{userId}:{documentId}`                                                                          |
| AC-019-FE-02 | A metadata store under `syncspace:{userId}:meta` records `{ documentId, lastSyncedAt }` for each known document                                                       |
| AC-019-FE-03 | On editor mount the locally persisted content is loaded and displayed immediately while the network sync completes                                                    |
| AC-019-FE-04 | The app calls `navigator.storage.persist()` on first load; if permission is not granted a non-blocking warning is shown                                               |
| AC-019-FE-05 | Documents from one user account (key `syncspace:{userA}:*`) are never opened or read by another account                                                               |
| AC-019-FE-06 | If the app opens while offline and no local copy exists, an informational message is shown: "This document is not available offline. Please connect to the internet." |
| AC-019-FE-07 | Refreshing or reopening a closed tab while **still offline** is explicitly unsupported; the app shows "Could not load document. You appear to be offline."            |

**Definition of Done**

- [ ] FE unit test: database key naming produces `syncspace:{userId}:{documentId}` for arbitrary inputs
- [ ] Playwright test: load document online → `setOffline(true)` → refresh page → content still visible after coming back online (open tab)

---

### US-020 · Clear local data on sign-out · P0 · Days 8–9 ⛔

**As a** signed-out user,
**I want** my local document data to be removed (or kept by my choice),
**so that** the next person to use this browser cannot read my documents.

#### Backend Acceptance Criteria

| #            | Criteria                                                                      |
| ------------ | ----------------------------------------------------------------------------- |
| AC-020-BE-01 | No backend criteria; local database management is entirely a frontend concern |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| AC-020-FE-01 | On sign-out the metadata store is read to obtain the list of database names for the current user                                |
| AC-020-FE-02 | Each y-indexeddb provider is closed before its database is deleted; deleting an open database is never attempted                |
| AC-020-FE-03 | All databases whose keys match `syncspace:{currentUserId}:*` are deleted; databases for other users are untouched               |
| AC-020-FE-04 | If deletion of a database fails, the failure is recorded in the metadata store and retried on the next sign-in of the same user |
| AC-020-FE-05 | "Sign out and keep changes" (US-005) skips deletion entirely                                                                    |
| AC-020-FE-06 | The README documents that local data is not encrypted and advises shared-computer users to choose "discard"                     |

**Definition of Done**

- [ ] Playwright test: sign in as User A → open document → sign out → sign in as User B → verify no IndexedDB keys beginning with `syncspace:{userAId}:` exist

---

## Epic 6 — Sync Status

> **Days:** 6–7, 9–10 · **All stories P0**

---

### US-021 · See an accurate sync status badge · P0 · Days 6–7, 9–10 ⛔

**As a** user editing a document,
**I want** to always see whether my work is saved locally, syncing, or durably saved on the server,
**so that** I know my work is safe.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-021-BE-01 | The server never sends any message that can be interpreted as "your work is saved" except the explicit `flushed` response after a Postgres commit |
| AC-021-BE-02 | Close codes are used consistently: 4401 session expired, 4403 access forbidden, 4404 document deleted, 1011 server error                          |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-021-FE-01 | The badge displays exactly one of eight states: **Saved**, **Saving locally**, **Offline**, **Connecting**, **Syncing**, **Locally saved**, **Sync error**, **Recovery pending** |
| AC-021-FE-02 | **Saved** is shown only after `flushed` is received with a nonce matching the latest sent flush and the epoch has not advanced                                                   |
| AC-021-FE-03 | **Syncing** is shown when the socket is connected but no confirmed flush exists for the current epoch                                                                            |
| AC-021-FE-04 | **Locally saved** is shown when the provider is disconnected and the pending marker is set                                                                                       |
| AC-021-FE-05 | **Offline** is shown when the provider is disconnected and the pending marker is not set                                                                                         |
| AC-021-FE-06 | **Connecting** is shown while the WebSocket handshake is in progress                                                                                                             |
| AC-021-FE-07 | **Sync error** is shown after a `flush-failed` reply or a 15-second reply timeout while connected; a Retry button is shown                                                       |
| AC-021-FE-08 | **Recovery pending** is shown after a 4403 close, before the removal dialog is dismissed                                                                                         |
| AC-021-FE-09 | Each state has a unique text label, a unique icon and triggers an `aria-live="polite"` announcement                                                                              |
| AC-021-FE-10 | A connected WebSocket alone never causes the badge to show **Saved**                                                                                                             |
| AC-021-FE-11 | Status is derived by a single pure function `deriveStatus(inputs)` with no side effects                                                                                          |

**Definition of Done**

- [ ] FE unit test: `deriveStatus` table test covers all eight states; impossible input combinations are tested and handled gracefully
- [ ] Playwright test: edit → Syncing → flushed → Saved; `setOffline` → Locally saved; reconnect → Syncing → Saved

---

### US-022 · Flush-and-confirm save acknowledgement · P0 · Days 6–7, 10 ⛔

**As a** developer building the system,
**I need** the save acknowledgement to be a first-class protocol,
**so that** "Saved" always means the database committed the data.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-022-BE-01 | `onStateless` routes messages with `type: "flush"` to `FlushHandler`                                                                                                                          |
| AC-022-BE-02 | `FlushHandler` checks the sender's role; viewers receive `flush-failed` with `reason: "forbidden"`                                                                                            |
| AC-022-BE-03 | The incoming `stateVector` is checked against the room's current state; if the room does not cover the client's vector, `flush-failed` with `reason: "behind"` is returned                    |
| AC-022-BE-04 | Messages exceeding 1 MB cause `flush-failed` with `reason: "too_large"`                                                                                                                       |
| AC-022-BE-05 | If `dirtySinceCommit` is false, `flushed` is returned immediately without a database write                                                                                                    |
| AC-022-BE-06 | If `dirtySinceCommit` is true, the write queue commits to Postgres; on success `flushed` with the matching `nonce` is sent; on failure `flush-failed` with `reason: "db_unavailable"` is sent |
| AC-022-BE-07 | `lastCommittedSV` is advanced only after a successful commit                                                                                                                                  |
| AC-022-BE-08 | Only one write per document runs at a time; a second flush arriving during a commit is coalesced into one follow-up write                                                                     |
| AC-022-BE-09 | Delete-only edits set `dirtySinceCommit` and are included in the commit                                                                                                                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-022-FE-01 | The flush controller sends `{ type: "flush", nonce, epoch, stateVector }` as a Hocuspocus stateless message                                                                                                |
| AC-022-FE-02 | A flush is sent after 1.5 seconds of quiet typing; at most once per second during continuous typing; immediately after reconnect sync; and on `visibilitychange` to hidden or `beforeunload` (best effort) |
| AC-022-FE-03 | Only the latest nonce is tracked; replies for older nonces are discarded                                                                                                                                   |
| AC-022-FE-04 | **Saved** is set only when `flushed.nonce` matches the latest sent nonce and `epoch` still equals the current edit counter                                                                                 |
| AC-022-FE-05 | The 15-second reply timeout timer is active only while the socket is connected; it is cancelled on disconnect                                                                                              |
| AC-022-FE-06 | A `behind` reply causes the client to wait 2 seconds and retry; it does not show an error                                                                                                                  |
| AC-022-FE-07 | Any other `flush-failed` reason shows **Sync error** with a Retry button                                                                                                                                   |
| AC-022-FE-08 | Viewers never send `flush`                                                                                                                                                                                 |

**Definition of Done**

- [ ] BE integration test: kill server before commit → client never shows Saved after restart
- [ ] BE integration test: clean document → `flushed` without DB write
- [ ] BE integration test: delete-only edit → committed on flush
- [ ] FE unit test: `flushed` with stale nonce is ignored; epoch mismatch prevents Saved
- [ ] Spikes 5 and 6 (LLD §13) must pass before this story is closed

---

## Epic 7 — Durable Persistence & Recovery

> **Days:** 5–6, 10 · **P0 unless marked**

---

### US-023 · Persist document updates to PostgreSQL · P0 · Days 5–6, 10

**As a** system,
**I need** every Yjs update to be stored durably in PostgreSQL,
**so that** no work is lost on server restart.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-023-BE-01 | Yjs updates are stored as `BYTEA` in `DocumentUpdate.updateData`; never serialized to JSON                                                                        |
| AC-023-BE-02 | Each row has a `seq` `BIGINT GENERATED ALWAYS AS IDENTITY` column; loading applies rows in ascending `seq` order                                                  |
| AC-023-BE-03 | Applying the same Yjs update bytes twice does not corrupt the document (idempotency is inherent to Yjs; no deduplication logic is needed beyond loading in order) |
| AC-023-BE-04 | All writes for one document pass through a single per-document async queue; concurrent writes for the same document are serialized                                |
| AC-023-BE-05 | A `pg_advisory_xact_lock(documentId)` is held during each commit to guard against overlap in rolling restarts                                                     |
| AC-023-BE-06 | `Document.updatedAt` is updated at most once every 30 seconds per document to avoid write amplification                                                           |
| AC-023-BE-07 | A debounced `onStoreDocument` hook (2-second debounce, 10-second max wait) triggers background commits; the flush protocol (US-022) triggers explicit commits     |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| AC-023-FE-01 | No frontend criteria for the persistence mechanism itself; the frontend's only signal is the `flushed` reply |

**Definition of Done**

- [ ] BE integration test: 100 sequential updates appended → load fresh room → document state identical
- [ ] BE integration test: same update bytes inserted twice → load → no corruption
- [ ] BE integration test: restart server mid-edit → reconnect → content intact

---

### US-024 · Restore a document after server restart · P0 · Day 10

**As a** user returning after a server restart,
**I want** my document content to be restored from the database,
**so that** I never lose durably saved work.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-024-BE-01 | `onLoadDocument` reads the latest `DocumentSnapshot` row (if any) and all `DocumentUpdate` rows with `seq > snapshot.upToSeq`, in ascending `seq` order |
| AC-024-BE-02 | The loaded state is applied to a fresh `Y.Doc`; `lastCommittedSV` is set to its state vector; `dirtySinceCommit` is set to false                        |
| AC-024-BE-03 | If no snapshot and no updates exist, the room starts with an empty `Y.Doc`                                                                              |
| AC-024-BE-04 | A client that re-flushes after the restart receives `flushed` only after the diff is committed to Postgres                                              |
| AC-024-BE-05 | The loaded document is served to the first connecting client via the normal Yjs sync handshake                                                          |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-024-FE-01 | On reconnect after a server restart the client performs a full state vector exchange; local edits that were not flushed before the restart are re-sent as part of the sync |
| AC-024-FE-02 | The status badge never shows **Saved** until a new `flushed` reply is received in the current session                                                                      |
| AC-024-FE-03 | If the reconnect fails (server still down) the badge shows **Connecting** with backoff; no data is lost from IndexedDB                                                     |

**Definition of Done**

- [ ] BE integration test: type → flush confirmed → restart server process → reconnect → document content identical → new flush → Saved
- [ ] BE integration test: type → server crashes before flush commit → reconnect → pending edits re-sent → Saved after new flush

---

### US-025 · Snapshot and compact update log · P2 · Day 10

**As a** developer,
**I need** the update log to be periodically compacted into snapshots,
**so that** document load time stays fast as the update count grows.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-025-BE-01 | When a room unloads and has more than 100 `DocumentUpdate` rows since the last snapshot, compaction is triggered                                                          |
| AC-025-BE-02 | Compaction acquires the same `pg_advisory_xact_lock` as the write queue                                                                                                   |
| AC-025-BE-03 | Inside one transaction: a new `DocumentSnapshot` is inserted with `upToSeq = M` (the highest seq at lock time), then all `DocumentUpdate` rows with `seq ≤ M` are deleted |
| AC-025-BE-04 | A crash before the transaction commits leaves the previous snapshot and updates fully intact                                                                              |
| AC-025-BE-05 | The next `onLoadDocument` after compaction produces a document state identical to before compaction                                                                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| AC-025-FE-01 | No frontend criteria; compaction is entirely a backend concern invisible to the client |

**Definition of Done**

- [ ] BE integration test: insert 150 updates → unload room → reload → document state identical; `DocumentUpdate` count ≤ 50

---

## Epic 8 — Sharing & Permissions

> **Days:** 11 · **All stories P0**

---

### US-026 · Share a document via invite link · P0 · Day 11

**As a** document owner,
**I want to** generate an invite link for a specific role,
**so that** I can let others join my document without manually managing each account.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-026-BE-01 | `POST /api/documents/:id/invitations` accepts `{ role, expiresIn?, maxUses?, email? }`                                                             |
| AC-026-BE-02 | Only owners may create invitations; editors and viewers receive 403 with `{ code: "FORBIDDEN" }`                                                   |
| AC-026-BE-03 | A cryptographically random 32-byte token is generated; its SHA-256 hash is stored in `DocumentInvitation.tokenHash`; the raw token is never stored |
| AC-026-BE-04 | Returns HTTP 201 with `{ id, token, role, expiresAt, emailSent }` — the raw token is returned only on creation                                     |
| AC-026-BE-05 | Default expiry is 7 days; accepted values for `expiresIn` are `"1d"` and `"30d"`; "no expiry" is not accepted                                      |
| AC-026-BE-06 | At most 10 active (non-revoked, non-expired) invite links per document; an 11th returns 422 with `{ code: "INVITATION_LIMIT_REACHED" }`            |
| AC-026-BE-07 | Roles allowed are `"EDITOR"` and `"VIEWER"` only; `"OWNER"` returns 422 with `{ code: "INVALID_ROLE" }`                                            |
| AC-026-BE-08 | Link creation is rate-limited to 20 per hour per user                                                                                              |
| AC-026-BE-09 | Returns 404 for documents the caller cannot see                                                                                                    |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| AC-026-FE-01 | A "Share" button opens a sharing dialog from the editor header                                                 |
| AC-026-FE-02 | The dialog lets the owner choose role (Editor or Viewer), expiry (1 day, 7 days, 30 days) and optional use cap |
| AC-026-FE-03 | On "Generate link" the POST is called; on success the full invite URL is shown with a "Copy" button            |
| AC-026-FE-04 | The invite URL places the token in the **URL fragment**: `/invite#<token>`                                     |
| AC-026-FE-05 | The raw token is shown only once; closing and reopening the dialog for the same invitation shows only metadata |
| AC-026-FE-06 | An optional "Also send by email" field is shown only when `EMAIL_ENABLED=true` (see US-032)                    |
| AC-026-FE-07 | The Share dialog and its controls are hidden entirely for editors and viewers                                  |

**Definition of Done**

- [ ] BE integration test: owner creates link → 201; editor creates → 403; 11th link → 422; OWNER role → 422
- [ ] BE integration test: raw token not present in DB; tokenHash is SHA-256 of the returned token
- [ ] Playwright test: owner opens share dialog → generates link → copies URL → URL contains fragment

---

### US-027 · Accept an invite link · P0 · Day 11

**As a** person who has received an invite link,
**I want to** open it and gain access to the document,
**so that** I can start collaborating.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-027-BE-01 | `POST /api/invitations/accept` accepts `{ token }` and requires a valid session                                                                                  |
| AC-027-BE-02 | The token is hashed with SHA-256 and looked up in `DocumentInvitation.tokenHash`                                                                                 |
| AC-027-BE-03 | Returns generic 422 `{ code: "INVITATION_INVALID" }` for tokens that are unknown, expired, revoked or exhausted; never reveals which condition applies           |
| AC-027-BE-04 | Emailed invitations: the signed-in user's email must match `DocumentInvitation.email` (case-insensitive); a mismatch returns the same `INVITATION_INVALID` error |
| AC-027-BE-05 | If the user is already a member at the same or higher role, returns 200 `{ documentId, alreadyMember: true }` without changing their role                        |
| AC-027-BE-06 | Accept is atomic: `DocumentMember` insert and `useCount` increment happen in one database transaction                                                            |
| AC-027-BE-07 | Accept is rate-limited to 10 requests per minute per IP                                                                                                          |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-027-FE-01 | The `/invite` page reads the token from the URL fragment on mount and stores it in `sessionStorage`                                                          |
| AC-027-FE-02 | If the user is not signed in, they are redirected to `/login?redirect=/invite` with the token preserved in `sessionStorage`                                  |
| AC-027-FE-03 | After sign-in or registration the app reads the token from `sessionStorage`, calls `POST /api/invitations/accept` and clears the token from `sessionStorage` |
| AC-027-FE-04 | On success (or `alreadyMember: true`) the user is redirected to `/documents/<documentId>`                                                                    |
| AC-027-FE-05 | On `INVITATION_INVALID` a full-page error is shown: "This invite link is invalid or has expired." with a link to the dashboard                               |
| AC-027-FE-06 | A loading state is shown while the accept request is in-flight                                                                                               |

**Definition of Done**

- [ ] BE integration test: valid token → member added; expired → INVITATION_INVALID; email mismatch → INVITATION_INVALID; already member → alreadyMember: true
- [ ] Playwright test: open invite URL → not signed in → redirected to login → sign in → auto-accepted → redirected to editor

---

### US-028 · List and revoke invite links · P0 · Day 11

**As a** document owner,
**I want to** see all active invite links and revoke them,
**so that** I can control who can join.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-028-BE-01 | `GET /api/documents/:id/invitations` returns active links with `{ id, role, createdAt, expiresAt, useCount, maxUses }`; the raw token is never returned |
| AC-028-BE-02 | Only owners may list invitations; others receive 403                                                                                                    |
| AC-028-BE-03 | `DELETE /api/documents/:id/invitations/:invId` sets `DocumentInvitation.revokedAt` to the current timestamp                                             |
| AC-028-BE-04 | A revoked invitation immediately fails validation in `POST /api/invitations/accept`                                                                     |
| AC-028-BE-05 | Revoking an invitation does not remove members who already accepted it                                                                                  |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| AC-028-FE-01 | The share dialog lists all active invite links with role, expiry and use count                           |
| AC-028-FE-02 | Each link has a "Revoke" button; clicking it shows an inline confirmation before calling DELETE          |
| AC-028-FE-03 | A note beneath the list reads: "Revoking stops new joins. People who already joined keep their access."  |
| AC-028-FE-04 | After revocation the link is removed from the list immediately (optimistic update or cache invalidation) |

**Definition of Done**

- [ ] BE integration test: revoke link → accept attempt returns INVITATION_INVALID; existing member still has access
- [ ] Playwright test: owner revokes link → link disappears from list; second user cannot use the link

---

### US-029 · Manage document members · P0 · Day 11

**As a** document owner,
**I want to** view, change roles of and remove members,
**so that** I can keep access up to date.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-029-BE-01 | `GET /api/documents/:id/members` returns `{ id, displayName, role, joinedAt }`; emails are never returned to any caller                                         |
| AC-029-BE-02 | `PATCH /api/documents/:id/members/:memberId` accepts `{ role }` and updates the member's role; only the owner may do this                                       |
| AC-029-BE-03 | `DELETE /api/documents/:id/members/:memberId` removes the member row; only the owner may do this                                                                |
| AC-029-BE-04 | Removal emits a `MemberRevoked` in-process event; the handler closes all of that user's connections for this document with code 4403 within one event-loop tick |
| AC-029-BE-05 | A role change closes the affected user's connections with code 4403 so they reconnect and pick up the new role                                                  |
| AC-029-BE-06 | The owner cannot remove or downgrade themselves; attempting returns 422 with `{ code: "CANNOT_MODIFY_OWNER" }`                                                  |
| AC-029-BE-07 | Returns 404 (not 403) for documents the caller cannot see                                                                                                       |
| AC-029-BE-08 | A document may have at most 20 members; adding a 21st returns 422 with `{ code: "MEMBER_LIMIT_REACHED" }`                                                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| AC-029-FE-01 | The share dialog lists current members with their display name and role badge                          |
| AC-029-FE-02 | Only the owner sees role-change dropdowns and remove buttons; editors and viewers see a read-only list |
| AC-029-FE-03 | Changing a role in the dropdown calls `PATCH` immediately; a success toast confirms the change         |
| AC-029-FE-04 | Clicking "Remove" shows an inline confirmation before calling `DELETE`                                 |
| AC-029-FE-05 | After removal the member is removed from the list immediately                                          |

**Definition of Done**

- [ ] BE integration test: remove member → their connections close with 4403 within 100 ms; subsequent connect rejected
- [ ] BE integration test: role change → new connection picks up new role
- [ ] BE integration test: owner tries to remove self → 422 CANNOT_MODIFY_OWNER

---

### US-030 · Enforce permissions on WebSocket connections · P0 · Days 5–6, 11 ⛔

**As the** system,
**I need** every WebSocket connection to be fully authorized server-side,
**so that** clients cannot bypass REST-level permission checks.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-030-BE-01 | `onAuthenticate` verifies the ticket HMAC signature; an invalid signature closes the connection with 4401                                                  |
| AC-030-BE-02 | `onAuthenticate` checks ticket expiry; an expired ticket closes the connection with 4401                                                                   |
| AC-030-BE-03 | `onAuthenticate` marks the `jti` as used; a replayed ticket closes with 4403                                                                               |
| AC-030-BE-04 | `onAuthenticate` reads the user's role from the database; the ticket claims are used only for identity (`sub`), never for role                             |
| AC-030-BE-05 | Viewer connections are set to read-only via the Hocuspocus `readOnly` option                                                                               |
| AC-030-BE-06 | On `beforeHandleMessage` the role is re-checked from a 30-second in-memory cache; if the cached role is null or the cache is cold, the database is queried |
| AC-030-BE-07 | Hiding a UI button is not considered authorization; every write path enforces the role independently                                                       |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| AC-030-FE-01 | The editor toolbar write controls are hidden for viewers, in addition to the server-side enforcement                |
| AC-030-FE-02 | A 4401 close triggers a session refresh attempt; if that fails the badge shows **Sync error** with "Sign in" action |
| AC-030-FE-03 | A 4403 close stops all reconnect attempts and transitions to **Recovery pending** (see US-031)                      |

**Definition of Done**

- [ ] BE integration test: viewer connection submits Yjs editor update → rejected with 1008
- [ ] BE integration test: replayed ticket → 4403
- [ ] BE integration test: role re-check cache expires → database queried on next message

---

### US-031 · Access revocation closes live connections · P0 · Day 11 ⛔

**As a** user whose access has been revoked,
**I want to** be informed immediately and have my local copy cleaned up,
**so that** I cannot continue editing a document I no longer have access to.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-031-BE-01 | The `MemberRevoked` event handler closes all of the removed user's connections for the document with close code 4403 within one event-loop tick |
| AC-031-BE-02 | A subsequent connection attempt from the removed user is rejected in `onAuthenticate` (role is null → 4403)                                     |
| AC-031-BE-03 | No reconnect loop is triggered by the server; the client is responsible for not retrying on 4403                                                |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-031-FE-01 | On receiving a 4403 close the editor is immediately set to `editable: false`                                                               |
| AC-031-FE-02 | A modal dialog is shown: "You were removed from this document. Your unsynced changes cannot be synced and will be discarded."              |
| AC-031-FE-03 | The dialog has a single **OK** button; there is no cancel option                                                                           |
| AC-031-FE-04 | After OK: the y-indexeddb database for this document is deleted, the metadata entry is removed, and the user is redirected to `/dashboard` |
| AC-031-FE-05 | No reconnect attempt is made after a 4403 close                                                                                            |
| AC-031-FE-06 | If the user was offline when removed, the same dialog appears on the next reconnect attempt (which also results in 4403)                   |

**Definition of Done**

- [ ] BE integration test: remove member while connected → 4403 close fires within 100 ms
- [ ] Playwright test: User B connected → User A (owner) removes User B → removal dialog shown to User B → OK → redirected to dashboard → document database deleted

---

## Epic 9 — Email (Optional)

> **Days:** 11 · `EMAIL_ENABLED=false` by default; none of these stories block any other epic**

---

### US-032 · Send invite link by email · P1 · Day 11

**As a** document owner,
**I want to** optionally email an invite link to a recipient,
**so that** I do not have to copy and paste it manually.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-032-BE-01 | When `POST /api/documents/:id/invitations` includes a non-empty `email` field and `EMAIL_ENABLED=true`, `EmailService.send()` is called after the invitation is stored |
| AC-032-BE-02 | An email send failure does not prevent the invitation from being created; the response includes `emailSent: false`                                                     |
| AC-032-BE-03 | Email is sent via a single HTTPS API call; SMTP is never used                                                                                                          |
| AC-032-BE-04 | The email body includes the inviter's display name, the document title and the invite link; it never includes document content                                         |
| AC-032-BE-05 | The email API key is read from `EMAIL_API_KEY`; it is never logged                                                                                                     |
| AC-032-BE-06 | Emailed invitations are single-use and have `email` set; non-emailed invitations are multi-use and have `email` null                                                   |
| AC-032-BE-07 | Rate limits: at most 5 invite emails per minute per user; at most 3 per hour to one address; at most `EMAIL_DAILY_BUDGET` per day                                      |
| AC-032-BE-08 | Rate limit counters are in-memory and reset on restart                                                                                                                 |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-032-FE-01 | An "Also send by email" input is shown in the share dialog only when `EMAIL_ENABLED=true` (detected via a feature flag endpoint or environment variable) |
| AC-032-FE-02 | The input accepts a single email address with basic format validation before submission                                                                  |
| AC-032-FE-03 | When `emailSent: true` is returned a success note "Invite email sent" is shown                                                                           |
| AC-032-FE-04 | When `emailSent: false` is returned a note "Email could not be sent. Copy the link instead." is shown; the link is still displayed                       |

**Definition of Done**

- [ ] BE integration test with memory stub: invite created with email → provider called once → `emailSent: true`
- [ ] BE integration test: provider throws → `emailSent: false` → invitation still created → 201
- [ ] BE integration test: 6th email in 1 minute → rate limited → `emailSent: false` reason `rate_limited`
- [ ] No real email provider is ever called in CI

---

### US-033 · App works fully without email · P0 · Day 11

**As a** developer or operator,
**I want to** run SyncSpace with `EMAIL_ENABLED=false`,
**so that** email is a convenience, not a dependency.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-033-BE-01 | With `EMAIL_ENABLED=false` (default) `NoopEmailProvider` is injected; it returns `{ sent: false, reason: "disabled" }` synchronously and makes no network calls |
| AC-033-BE-02 | No error or warning is logged solely because email is disabled                                                                                                  |
| AC-033-BE-03 | All auth, document, collaboration and sharing endpoints function identically regardless of `EMAIL_ENABLED`                                                      |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| AC-033-FE-01 | When `EMAIL_ENABLED=false` the "Also send by email" input is hidden and no email-related UI is shown |
| AC-033-FE-02 | All sharing flows (copy link, manage members, revoke) work identically regardless of `EMAIL_ENABLED` |

**Definition of Done**

- [ ] BE integration test: `EMAIL_ENABLED=false` → full sign-up → document → share → collaborate flow works without errors
- [ ] Playwright test: `EMAIL_ENABLED=false` → share dialog has no email field

---

## Epic 10 — UI, Accessibility & Theme

> **Days:** 1–2, 12 · **P0 unless marked**

---

### US-034 · Light, dark and system themes · P0 · Days 1–2, 12

**As a** user,
**I want to** choose between light, dark and system themes,
**so that** the app suits my preferences and environment.

#### Backend Acceptance Criteria

| #            | Criteria                                                       |
| ------------ | -------------------------------------------------------------- |
| AC-034-BE-01 | `PATCH /api/users/me` accepts `{ preferences: { theme: "light" | "dark" | "system" } }` and persists the value |
| AC-034-BE-02 | `GET /api/users/me` returns `preferences.theme`                |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| AC-034-FE-01 | The settings page at `/settings` offers Light, Dark and System options via a segmented control or select                 |
| AC-034-FE-02 | The selection is applied immediately without a page reload                                                               |
| AC-034-FE-03 | The selection is persisted to `preferences.theme` via `PATCH /api/users/me`                                              |
| AC-034-FE-04 | System mode tracks `prefers-color-scheme` and updates immediately when it changes                                        |
| AC-034-FE-05 | No flash of wrong theme on first paint; `suppressHydrationWarning` and a correct theme cookie or class strategy are used |
| AC-034-FE-06 | All color values come from shadcn CSS variable tokens; no hardcoded hex values appear in component code                  |
| AC-034-FE-07 | Accent color is `#6254E8`; light background `#F7F7FB`; dark background `#14141C` as CSS tokens                           |

**Definition of Done**

- [ ] Playwright test: set Dark → reload → Dark applied with no flash; set System → simulate OS dark → app follows

---

### US-035 · Accessible sync status · P0 · Days 6–7

**As a** user relying on assistive technology,
**I want** sync status to be communicated in text and not color alone,
**so that** I always know the state of my work.

#### Backend Acceptance Criteria

| #            | Criteria                                                          |
| ------------ | ----------------------------------------------------------------- |
| AC-035-BE-01 | No backend criteria; accessibility is entirely a frontend concern |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| AC-035-FE-01 | Each of the eight sync states has a unique text label and a unique icon; color is never the only distinguishing signal |
| AC-035-FE-02 | State transitions trigger an `aria-live="polite"` announcement using the new state's text label                        |
| AC-035-FE-03 | The **Sync error** badge is a focusable button when the Retry action is available; focus moves to it on error          |
| AC-035-FE-04 | Color contrast for all badge states meets WCAG 2.1 AA in both light and dark themes                                    |

**Definition of Done**

- [ ] Manual screen-reader test (VoiceOver or NVDA): state changes from Syncing → Saved → Offline are all announced
- [ ] Playwright automated contrast check for all eight states in both themes

---

### US-036 · i18n-ready string management · P1 · Days 1–12

**As a** developer,
**I want** all user-visible strings in one messages module,
**so that** translations can be added later without touching component code.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-036-BE-01 | All API error responses include a stable machine-readable `code` field (e.g. `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `SESSION_EXPIRED`)        |
| AC-036-BE-02 | No human-readable English sentences are returned in the `message` field for errors the UI needs to translate; `message` may contain a developer hint |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| AC-036-FE-01 | All user-visible strings are defined in a single `messages.ts` module; no string literals appear directly in JSX |
| AC-036-FE-02 | API error `code` values are mapped to display strings in `messages.ts`                                           |
| AC-036-FE-03 | A lint rule or code-review check confirms no unlocalized string literals exist in component files                |

**Definition of Done**

- [ ] Code review: grep for string literals in JSX files returns no unlocalized UI strings

---

## Epic 11 — Infrastructure, Ops & Security

> **Days:** 1–3, 10, 13 · **All stories P0**

---

### US-037 · Health check endpoints · P0 · Days 2–3

**As an** operator or load balancer,
**I want** health check endpoints,
**so that** I can tell whether the API is alive and ready.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-037-BE-01 | `GET /api/health` returns HTTP 200 with `{ status: "ok" }` immediately, with no database call                                                                                 |
| AC-037-BE-02 | `GET /api/health/ready` returns HTTP 200 `{ status: "ready" }` after a successful `SELECT 1` on the database; returns HTTP 503 `{ status: "unavailable" }` if the query fails |
| AC-037-BE-03 | Both endpoints require no authentication                                                                                                                                      |
| AC-037-BE-04 | Neither endpoint logs at INFO level on a successful call to avoid log spam                                                                                                    |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| AC-037-FE-01 | On initial page load the web app calls `GET /api/health` (fire-and-forget) to wake the Render service |
| AC-037-FE-02 | The health call is not awaited and does not block page rendering                                      |

**Definition of Done**

- [ ] BE integration test: `/api/health` returns 200 when the database connection is closed; `/api/health/ready` returns 503 when the database is unreachable

---

### US-038 · Environment variable validation at startup · P0 · Days 1–2

**As a** developer,
**I want** the API to fail fast with a clear error when a required environment variable is missing,
**so that** misconfiguration is caught before runtime.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-038-BE-01 | All environment variables are declared in a zod schema in `src/config/` and validated before the NestJS application bootstraps               |
| AC-038-BE-02 | A missing or invalid variable prints a human-readable zod error listing the failing field and exits with process code 1                      |
| AC-038-BE-03 | Sensitive values (`BETTER_AUTH_SECRET`, `EMAIL_API_KEY`, `COLLAB_TICKET_SECRET`, `DATABASE_URL`, `DIRECT_URL`) are never logged at any level |
| AC-038-BE-04 | Optional variables (e.g. `EMAIL_ENABLED`, `EMAIL_API_KEY`) have documented defaults and do not cause startup failure when absent             |

#### Frontend Acceptance Criteria

| #            | Criteria                                                  |
| ------------ | --------------------------------------------------------- |
| AC-038-FE-01 | No frontend criteria; env validation is a backend concern |

**Definition of Done**

- [ ] BE unit test: start the config module with `DATABASE_URL` missing → zod error printed → process exits with code 1

---

### US-039 · Graceful shutdown · P0 · Days 10–13

**As a** developer deploying to Render,
**I want** the server to flush pending work before it exits on `SIGTERM`,
**so that** rolling restarts do not lose unacknowledged updates.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| AC-039-BE-01 | On `SIGTERM` the HTTP server stops accepting new connections immediately                             |
| AC-039-BE-02 | All in-flight document write queues are allowed to complete or time out before exit                  |
| AC-039-BE-03 | The process exits within 15 seconds of receiving `SIGTERM`, even if some queues time out             |
| AC-039-BE-04 | Hocuspocus `onStoreDocument` is called for all dirty rooms before shutdown                           |
| AC-039-BE-05 | A structured log line `{ event: "shutdown", reason: "SIGTERM" }` is emitted at the start of shutdown |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-039-FE-01 | When the server closes connections during shutdown the client provider treats it as a normal disconnect and begins reconnecting with backoff |
| AC-039-FE-02 | The status badge shows **Connecting** during the restart; local edits are preserved in IndexedDB                                             |

**Definition of Done**

- [ ] BE integration test: `SIGTERM` → pending flush completes → process exits cleanly; client reconnects and document content is intact

---

### US-040 · Origin and CORS security · P0 · Days 2–3

**As a** security-conscious operator,
**I want** the API to enforce origin checks,
**so that** cross-origin requests are blocked.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-040-BE-01 | All state-changing REST requests (`POST`, `PATCH`, `DELETE`) include an `Origin` header check against the `WEB_ORIGIN` environment variable; mismatches return 403 |
| AC-040-BE-02 | WebSocket upgrade requests check the `Origin` header against `WEB_ORIGIN`; mismatches are rejected with HTTP 403 before the upgrade                                |
| AC-040-BE-03 | No `Access-Control-Allow-Origin: *` header is set on the REST API; the Vercel rewrite makes CORS unnecessary for browser requests                                  |
| AC-040-BE-04 | No secrets appear in any response body or header                                                                                                                   |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AC-040-FE-01 | No `NEXT_PUBLIC_*` variables hold secrets; only harmless URLs (`NEXT_PUBLIC_WS_URL`) are public                            |
| AC-040-FE-02 | The Vercel `next.config.ts` rewrite forwards `/api/:path*` to `${API_URL}/api/:path*`; `API_URL` is a server-only variable |

**Definition of Done**

- [ ] BE integration test: REST POST with wrong Origin → 403; correct Origin → 200
- [ ] BE integration test: WebSocket upgrade with wrong Origin → HTTP 403; upgrade not completed

---

### US-041 · Rate limiting on sensitive endpoints · P0 · Days 2–3, 11

**As a** developer,
**I want** rate limits on auth, ticket and invite endpoints,
**so that** the free-tier quota and user accounts are protected.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| AC-041-BE-01 | Sign-in and sign-up: 10 requests per minute per IP                                                          |
| AC-041-BE-02 | Collaboration ticket endpoint: 30 requests per minute per authenticated user                                |
| AC-041-BE-03 | Invite accept: 10 requests per minute per IP                                                                |
| AC-041-BE-04 | Invite create: 20 per hour per authenticated user                                                           |
| AC-041-BE-05 | Exceeding any limit returns HTTP 429 with a `Retry-After` header indicating seconds until the window resets |
| AC-041-BE-06 | Counters are in-memory per process and reset on restart; this is acceptable at MVP scale and is documented  |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| AC-041-FE-01 | On receiving HTTP 429 the UI shows a non-blocking toast: "Too many requests. Please wait a moment and try again." |
| AC-041-FE-02 | The submit button is re-enabled after the `Retry-After` duration if it is 60 seconds or less                      |

**Definition of Done**

- [ ] BE integration test: 11 sign-in requests in 60 seconds from one IP → 11th returns 429 with `Retry-After`

---

### US-042 · Document and message size limits · P0 · Day 10

**As a** developer,
**I want** hard limits on message and document sizes,
**so that** large pastes or malicious payloads cannot exhaust server resources.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| AC-042-BE-01 | WebSocket Yjs update messages larger than 1 MB are rejected; the connection is closed with code 1009 (message too big)               |
| AC-042-BE-02 | A `flush` message whose `stateVector` indicates a document state larger than 5 MB is rejected with `flush-failed` reason `too_large` |
| AC-042-BE-03 | A user may own at most 50 documents; creating a 51st returns 422 `{ code: "DOCUMENT_LIMIT_REACHED" }`                                |
| AC-042-BE-04 | A document may have at most 20 members; adding a 21st returns 422 `{ code: "MEMBER_LIMIT_REACHED" }`                                 |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-042-FE-01 | On receiving close code 1009 the client shows a toast: "Your last change was too large and could not be synced. Please reduce the content and try again." |
| AC-042-FE-02 | On receiving `flush-failed` reason `too_large` the badge shows **Sync error** with message "Document is too large to sync."                               |

**Definition of Done**

- [ ] BE integration test: send 1.1 MB Yjs update → connection closed with 1009
- [ ] BE integration test: 51st document → 422 DOCUMENT_LIMIT_REACHED

---

## Epic 12 — Testing & CI

> **Days:** 1, 12 · **All stories P0**

---

### US-043 · CI runs on every pull request · P0 · Day 1

**As a** developer,
**I want** CI to run lint, typecheck, build and tests on every pull request,
**so that** broken code is caught before merging.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-043-BE-01 | GitHub Actions runs the following BE steps on every PR: `oxlint` → `tsc --noEmit` → `nest build` → Vitest unit tests → Vitest integration tests (Neon CI branch) |
| AC-043-BE-02 | Integration tests use the Neon `ci` branch connection string from a GitHub repository secret; the `main` branch is never used in CI                              |
| AC-043-BE-03 | Email integration tests inject `MemoryEmailProvider`; no real email provider is called                                                                           |
| AC-043-BE-04 | A failing step fails the PR check and blocks merge                                                                                                               |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC-043-FE-01 | GitHub Actions runs the following FE steps on every PR: ESLint → `tsc --noEmit` → `next build` → Vitest unit tests → Playwright tests |
| AC-043-FE-02 | Playwright tests run against a locally started dev server or a preview deployment                                                     |
| AC-043-FE-03 | A failing step fails the PR check and blocks merge                                                                                    |
| AC-043-FE-04 | Turborepo caches `tsc` and `next build` outputs; integration-test tasks are excluded from caching                                     |

**Definition of Done**

- [ ] A green PR merges; a deliberately introduced type error fails CI before merge

---

### US-044 · Critical failure scenario tests · P0 · Day 12

**As a** developer,
**I want** automated tests for all critical failure scenarios,
**so that** the demo does not reveal a regression.

#### Backend Acceptance Criteria

| #            | Criteria                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| AC-044-BE-01 | BE integration test: backend restart mid-edit → content intact after reconnect                                                  |
| AC-044-BE-02 | BE integration test: database unavailable → `flush-failed` db_unavailable → badge Sync error; database returns → Retry succeeds |
| AC-044-BE-03 | BE integration test: permission revoked while connected → 4403 close fires within 100 ms                                        |
| AC-044-BE-04 | BE integration test: two Node providers type concurrently → both document states identical                                      |
| AC-044-BE-05 | BE integration test: session expires → 401 on next REST call; WebSocket close 4401                                              |
| AC-044-BE-06 | BE unit test: duplicate Yjs update applied twice → document state unchanged                                                     |
| AC-044-BE-07 | BE integration test: delete-only edit → `dirtySinceCommit` true → committed on flush                                            |
| AC-044-BE-08 | BE integration test: invite expired → INVITATION_INVALID                                                                        |
| AC-044-BE-09 | BE integration test: invite revoked → INVITATION_INVALID; existing member unaffected                                            |
| AC-044-BE-10 | BE integration test: invite use count exhausted → INVITATION_INVALID                                                            |
| AC-044-BE-11 | BE integration test: email provider throws → `emailSent: false`; invite still created                                           |
| AC-044-BE-12 | BE integration test: emailed invite accepted by different account → INVITATION_INVALID                                          |
| AC-044-BE-13 | BE integration test: server SIGTERM before commit → client never receives `flushed`; after restart new flush succeeds           |
| AC-044-BE-14 | BE integration test: socket drops mid-edit → reconnect → pending edits delivered → Saved                                        |

#### Frontend Acceptance Criteria

| #            | Criteria                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| AC-044-FE-01 | Playwright: `setOffline(true)` → type → `setOffline(false)` → badge reaches "Saved"; document content identical on both clients |
| AC-044-FE-02 | Playwright: permission revoked → removal dialog shown → OK → redirected to dashboard → document DB deleted                      |
| AC-044-FE-03 | Playwright: session expires → badge shows Sync error with "Sign in" action → sign in → editor resumes                           |
| AC-044-FE-04 | Playwright: sign out as User A → sign in as User B → no IndexedDB keys for User A exist                                         |
| AC-044-FE-05 | Playwright: same document open in two tabs → both converge after offline edit; no duplicate-write errors in console             |

**Definition of Done**

- [ ] All 14 BE integration/unit scenarios have passing tests tagged `@critical`
- [ ] All 5 Playwright scenarios have passing tests tagged `@critical`
- [ ] All `@critical` tests run as a named CI step and block merge on failure

---

## Appendix A — Story Map (Day Order)

| Day   | Stories                                                        |
| ----- | -------------------------------------------------------------- |
| 1–2   | US-001, US-002, US-003, US-004, US-006, US-038, US-043         |
| 2–3   | US-034, US-037, US-040, US-041                                 |
| 3–4   | US-007, US-008, US-009, US-010, US-011                         |
| 4–5   | US-012, US-013                                                 |
| 5–6   | US-014, US-015, US-023                                         |
| 6–7   | US-016, US-021, US-022, US-035                                 |
| 8–9   | US-005, US-017, US-018, US-019, US-020                         |
| 10    | US-024, US-025, US-039, US-042                                 |
| 11    | US-026, US-027, US-028, US-029, US-030, US-031, US-032, US-033 |
| 12    | US-036, US-044                                                 |
| 13–14 | Deploy hardening, README, demo recording                       |

---

## Appendix B — Non-Negotiable Stories

These stories must ship regardless of time pressure.
Cutting scope elsewhere is always preferable to cutting these.

| Story     | Owner   | Why it cannot be cut                                                    |
| --------- | ------- | ----------------------------------------------------------------------- |
| US-022 ⛔ | BE + FE | Persistence acknowledgement is the core promise of the product          |
| US-030 ⛔ | BE      | Permission checks on the WebSocket are a security baseline              |
| US-021 ⛔ | FE      | Sync status badge is the key differentiator of SyncSpace                |
| US-020 ⛔ | FE      | Per-account local data isolation is a security requirement              |
| US-031 ⛔ | BE + FE | Revocation closing live connections is required by the permission model |
