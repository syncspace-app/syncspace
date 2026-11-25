# SyncSpace Design System and Screen Spec

> **Status:** v1 · **Updated:** 2026-11-23
> **Companions:** [HLD](./architecture-hld.md) · [LLD](./architecture-lld.md) · `tokens.css` (copy values into `apps/web/app/globals.css`)
> **Visual source:** the "SyncSpace UI Design" canvas. Export its screens to `docs/design/` (see [§14](#14-using-the-canvas-in-the-repo)) so the repo carries the pictures.

Everything here is built from shadcn/ui components and Tailwind with semantic tokens. If a screen picture and this document disagree, fix the one that is wrong and tell the team.

---

## 1. Principles

1. **Calm and minimal.** Hairline borders over shadows, generous editor whitespace, one accent color.
2. **Honest status.** The sync badge always shows icon plus words, and "Saved" appears only after the server confirms a write.
3. **Mobile first.** Design at 320 px, then enlarge. Never shrink the desktop layout.
4. **Tokens only.** No raw hex, no `bg-white`, no one-off radii.
5. **Both themes, every component.** A component is not done until it has been checked in light and dark at 320 px.
6. **Server decides access.** The UI hides what you cannot do, but hiding is never authorization.

---

## 2. Brand and logo

- **Mark:** two overlapping pages (a shared document) with a check (synced), inside an indigo rounded square.
- **Wordmark:** "SyncSpace" in Inter 600 with tight tracking; "Space" in the primary color.
- **Tagline:** "Your workspace. Always in sync."
- Variants: on light, on dark, and white-on-indigo. Mark alone for the favicon, app icon and avatars. Minimum mark size 16 px, clear space of half the mark height. Never stretch, recolor outside the tokens or add effects.

---

## 3. Color

Values live in `tokens.css`. Always reference the token, never the hex.

| Token                      | Light                  | Dark                   | Use                             |
| -------------------------- | ---------------------- | ---------------------- | ------------------------------- |
| `background`               | `#F7F7FB`              | `#14141C`              | App canvas                      |
| `card`                     | `#FFFFFF`              | `#1B1B26`              | Editor surface, cards, rows     |
| `popover`                  | `#FFFFFF`              | `#20202D`              | Menus, dialogs, floating layers |
| `foreground`               | `#1A1A24`              | `#ECECF3`              | Primary text                    |
| `muted-foreground`         | `#6B6B7B`              | `#9A9AAE`              | Secondary text, metadata        |
| `muted` / `secondary`      | `#F0F0F5`              | `#222230`              | Quiet fills, skeletons          |
| `border` / `input`         | `#E6E6EE`              | `#2A2A38`              | Hairlines and field borders     |
| `primary`                  | `#6254E8`              | `#8A7FF5`              | Main actions, links, focus ring |
| `primary-foreground`       | `#FFFFFF`              | `#14141C`              | Text on primary (flips in dark) |
| `accent`                   | `#EEECFD`              | `#25224A`              | Selected and hover tint         |
| `accent-foreground`        | `#3B30B5`              | `#C7C2FF`              | Text on accent                  |
| `destructive`              | `#DC2626`              | `#F87171`              | Destructive buttons             |
| `success` on `success-bg`  | `#15803D` on `#E7F6EC` | `#4ADE80` on `#12281B` | Saved                           |
| `warning` on `warning-bg`  | `#B45309` on `#FEF3C7` | `#FBBF24` on `#2B2210` | Locally saved, notices          |
| `error-text` on `error-bg` | `#B91C1C` on `#FEE2E2` | `#F87171` on `#3A1616` | Sync error text on a tint       |

**Collaborator colors:** 8 fixed colors (`--collab-1` to `--collab-8`) for avatars and remote cursors, the same in both themes, with dark text on top. The color is a hash of the user id, so one person always gets the same color. These are deliberately separate from brand and status colors.

**Contrast:** these values are my estimates. Run the main text, button and badge pairs through a contrast checker (target 4.5:1 for text) before you lock them, in both themes.

---

## 4. Typography

| Role                    | Size / line height          | Weight |
| ----------------------- | --------------------------- | ------ |
| Page title              | 24 / 32                     | 600    |
| Document title (editor) | 36 / 44 (28 / 36 on mobile) | 700    |
| Section heading         | 18 / 28                     | 600    |
| Body (interface)        | 14 / 20                     | 400    |
| Editor body             | 16 / 28                     | 400    |
| Label and button        | 13 / 20                     | 500    |
| Caption and metadata    | 12 / 16                     | 400    |

- **Fonts:** Inter for the interface and editor, Geist Mono for code blocks, loaded through `next/font`. Keep fallbacks for non-Latin scripts (Noto Sans families) for future languages.
- The interface stays at 14 px for density. The editor is 16 px with about 1.7 line height, in a column of about 720 px, so reading and writing stay comfortable.

---

## 5. Shape, spacing, elevation and motion

- **Spacing:** Tailwind's 4 px grid, mostly 4, 8, 12, 16, 24, 32.
- **Radius:** 6 px inputs and buttons, 8 px menus, 12 px cards and dialogs (`--radius` is 0.5 rem).
- **Elevation:** borders define structure. Shadows only on floating layers (menus, dialogs, toasts). A dimmed overlay sits behind modal layers.
- **Motion:** 120 to 200 ms ease-out for hover and state changes. No bouncy animation. Honor `prefers-reduced-motion` (`tokens.css` includes the rule).

---

## 6. Breakpoints and layout

| Width          | Navigation                                                                    | Editor                                               | Dialogs          |
| -------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- |
| 320 to 639 px  | Bottom navigation (Docs, Shared, Settings) and a floating new-document button | Full screen, docked scrolling toolbar at the bottom  | Bottom sheets    |
| 640 to 1023 px | Icon-rail sidebar                                                             | Condensed toolbar under the header                   | Centered dialogs |
| 1024 px and up | Persistent 240 px sidebar                                                     | Full toolbar, presence and sync status in the header | Centered dialogs |

Rules: mobile-first Tailwind (`sm:`, `md:`, `lg:`), `min-h-dvh` instead of `100vh`, tap targets at least 44 px, no horizontal page scroll at 320 px, wide content (tables, code) scrolls inside its own container. Test at 320, 375, 768, 1024 and 1440 px.

---

## 7. Components and variants

Install the shadcn components as you reach each screen, not all at once.

| Group      | shadcn components                                              | Variants and notes                                                                                                                      |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Shell      | `sidebar`, `sheet`, `separator`, `tooltip`, `avatar`           | Sidebar: persistent, icon rail, mobile sheet. Avatar sizes 24, 28, 32, 40, 64                                                           |
| Buttons    | `button`                                                       | `default`, `outline`, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`, `icon` (44 px on touch); disabled and loading states |
| Forms      | `input`, `label`, `select`, `form`, `switch`, `radio-group`    | States: default, focus, error with helper text, disabled                                                                                |
| Feedback   | `badge`, `sonner` (toasts), `skeleton`, `alert`                | Role tags (Owner, Editor, Viewer), status badges, info and warning banners                                                              |
| Overlays   | `dialog`, `alert-dialog`, `drawer`, `dropdown-menu`, `popover` | Dialog on desktop, drawer (bottom sheet) on mobile for the same content                                                                 |
| Editor     | `toggle`, `toggle-group`, `scroll-area`                        | Toolbar buttons with pressed state                                                                                                      |
| Navigation | `tabs`                                                         | Settings tabs: Profile, Appearance, Account                                                                                             |

**Custom components** (shadcn has no equivalent; keep them small, token-only, and in `components/sync` and `components/collaboration`)

| Component                     | Purpose                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SyncStatusBadge`             | The eight states ([§9](#9-sync-status-spec)), icon plus label, `aria-live`                                |
| `OfflineBanner`               | Offline and Locally saved explanation inside the editor                                                   |
| `PresenceAvatars`             | Overlapping collaborator avatars with a `+N` overflow                                                     |
| Remote cursor styles          | Colored caret with a name label for Tiptap                                                                |
| `InviteLinkRow`, `CopyButton` | Active link row with role, expiry, uses and Revoke; a Copy button with a Copied state                     |
| `LanguageSwitcher`            | Globe button plus menu, a settings select and a mobile picker; hidden until more than one language exists |
| `RoleAwareMenu`               | Document row menu that shows only the actions the role allows                                             |

---

## 8. Screen inventory

Routes follow the LLD. **Canvas** column: which pictures exist now. "D" is desktop, "T" is tablet, "M" is mobile, "L" is light, "Dk" is dark.

| Screen                                                 | Route                    | Canvas now           | Still to draw                    |
| ------------------------------------------------------ | ------------------------ | -------------------- | -------------------------------- |
| Foundations, brand, components                         | n/a                      | L                    | Dark component sheet             |
| Landing                                                | `/`                      | D L, D Dk, M L       | M Dk, T                          |
| Sign in, create account                                | `/login`, `/register`    | D L, M L             | Dk, T                            |
| Dashboard                                              | `/dashboard`             | D L, D Dk, T L, M L  | T Dk, M Dk, role-aware row menu  |
| Dialogs: rename, delete, search                        | dashboard                | D L                  | Dk, M versions                   |
| Editor (owner or editor)                               | `/documents/[id]`        | D Dk, T Dk, M L      | D L, T L, M Dk                   |
| Viewer editor                                          | same                     | D L, D Dk, M L, M Dk | T                                |
| Share dialog and sheet                                 | editor                   | D L, D Dk, M L, M Dk | T                                |
| Invite page (4 states)                                 | `/invite`                | D L, D Dk            | M                                |
| Access removed, deleted, not found                     | editor                   | D L, D Dk            | M                                |
| Settings and theme                                     | `/settings`              | D L, M L             | Dk, T, demo-account locked state |
| Language switcher                                      | header, footer, settings | D L, D Dk, M picker  | n/a                              |
| Sync states (8)                                        | editor header            | L                    | Dk                               |
| Empty, loading, error, offline banner, session expired | various                  | L                    | Dk                               |
| Logout dialog                                          | user menu                | none                 | D and M, both themes             |
| Recovery pending dialog                                | editor                   | none                 | D and M                          |
| Cold-start "Connecting" state                          | editor                   | none                 | D and M                          |
| Banners (demo, storage warning), limit messages        | various                  | none                 | All                              |
| User menu                                              | sidebar and header       | none                 | D and M                          |

**Superseded in the canvas, do not build from them:** the Forgot password and Reset password screens, the Verify email and "Check your inbox" cards, the Decline button on the old invitation card, the email field on the old share dialog, the Verified badge and Change photo on Settings, and the Share button shown to non-owners. These contradict the architecture (no email provider, invite links only).

---

## 9. Sync status spec

One pure function derives the state ([LLD §7.4](./architecture-lld.md#74-deriving-the-sync-status)). Every state has an icon, a word and an announcement, and **color is never the only signal**.

| State            | Label           | Icon      | Tone    | Announcement (`aria-live="polite"`)                    | Action                  |
| ---------------- | --------------- | --------- | ------- | ------------------------------------------------------ | ----------------------- |
| Saved            | Saved           | check     | success | "All changes saved."                                   | none                    |
| Saving locally   | Saving locally  | loader    | neutral | not announced (transient)                              | none                    |
| Offline          | Offline         | cloud-off | neutral | "You're offline. You can keep editing."                | none                    |
| Connecting       | Connecting      | refresh   | neutral | "Connecting to the server."                            | none                    |
| Syncing          | Syncing         | refresh   | accent  | "Syncing your changes."                                | none                    |
| Locally saved    | Locally saved   | cloud-off | warning | "Saved on this device. Not synced yet."                | none                    |
| Sync error       | Sync error      | alert     | error   | "Couldn't sync. Your changes are kept on this device." | Retry, or Sign in again |
| Recovery pending | Needs attention | alert     | warning | "Action needed to finish syncing."                     | Review                  |

- Wait about 2 seconds after a disconnect before showing Offline or Locally saved, so brief blips do not flash.
- Do not announce every transition: throttle announcements so a screen reader is not flooded while someone types.
- A cold start (Render waking, up to about a minute) shows **Connecting** with the text "Waking up the server. This can take up to a minute." It is never an error.

---

## 10. Copy catalogue (English, keyed)

All user-visible text lives in one messages module, keyed so languages can be added later. The API sends stable error `code` values; the UI maps a code to a message here.

| Key                     | English                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `status.saved`          | Saved                                                                                                  |
| `status.offline`        | Offline                                                                                                |
| `status.locallySaved`   | Locally saved                                                                                          |
| `status.syncing`        | Syncing                                                                                                |
| `status.connecting`     | Connecting                                                                                             |
| `status.syncError`      | Sync error                                                                                             |
| `status.recovery`       | Needs attention                                                                                        |
| `banner.offline`        | You're offline. Changes are saved on this device and will sync when you reconnect.                     |
| `banner.viewOnly`       | You have view access. Ask the owner for edit access.                                                   |
| `banner.demo`           | Demo: don't use real data.                                                                             |
| `banner.storage`        | Your browser may clear offline data. Keep this document synced.                                        |
| `error.generic`         | Something went wrong. Try again.                                                                       |
| `error.forbidden`       | You don't have access to this document.                                                                |
| `error.notFound`        | This document doesn't exist, or hasn't been shared with you.                                           |
| `error.inviteInvalid`   | This link is invalid or has expired.                                                                   |
| `error.rateLimited`     | Too many attempts. Try again in a minute.                                                              |
| `error.docLimit`        | You've reached the document limit.                                                                     |
| `error.tooLarge`        | This document is too large.                                                                            |
| `empty.documents.title` | No documents yet                                                                                       |
| `empty.documents.body`  | Create your first document to start writing and sharing.                                               |
| `access.removed.title`  | Your access was removed                                                                                |
| `access.removed.body`   | The owner removed you. The copy on this device was deleted, including any unsynced edits.              |
| `access.deleted.title`  | This document was deleted                                                                              |
| `logout.title`          | You have unsynced changes                                                                              |
| `logout.stay`           | Stay signed in                                                                                         |
| `logout.keep`           | Log out and keep changes on this device                                                                |
| `logout.discard`        | Log out and discard changes                                                                            |
| `logout.sharedWarning`  | On a shared computer, choose discard. Offline data is not encrypted.                                   |
| `share.title`           | Share "{title}"                                                                                        |
| `share.create`          | Create link                                                                                            |
| `share.shownOnce`       | Shown once. Copy it now; it can't be viewed again.                                                     |
| `share.revokeNote`      | Revoking a link stops new people joining. People who already joined keep access until you remove them. |
| `language.label`        | Language                                                                                               |
| `language.help`         | Changes menus and messages. Document text is never translated.                                         |

---

## 11. Accessibility

- Semantic HTML, keyboard-reachable everything, visible focus rings (the `ring` token), accessible names on icon-only buttons.
- Status is icon plus text plus an `aria-live` announcement. Never color alone.
- Text contrast 4.5:1, large text and UI components 3:1, in both themes.
- Tap targets at least 44 px on touch layouts.
- Dialogs trap focus and return it on close. Bottom sheets are dismissible by a close button, not only by swiping.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (System is the default theme).
- Forms: every field has a label, errors are linked to their fields and described in text.

---

## 12. Internationalization and the language switcher

English only at launch, but built to extend.

- **Messages:** all user-visible strings come from one module keyed as in [§10](#10-copy-catalogue-english-keyed). Never hardcode text in components.
- **Switcher placement:** a globe button with a menu in the landing and marketing header, a select in the landing footer, a Language row in Settings, and a bottom-sheet picker on mobile.
- **Visibility:** hidden until more than one language is enabled. Show native names ("हिन्दी", "Español"), never flags.
- **Layout:** allow about 40 percent text growth in buttons, badges and menus. Support right-to-left by using logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`) instead of left and right.
- **Formatting:** use `Intl` for dates, relative times ("2 min ago") and numbers.
- **Document content is never translated.** Only the app's own text is.
- **Routing decision, to make before building the UI:** keep locales out of the URL for the signed-in app, and decide whether the public pages get a `/[locale]` segment. This is the hardest thing to change later.

---

## 13. Theme implementation notes

- Use `next-themes` with Light, Dark and System, System as the default, with `suppressHydrationWarning` on the `<html>` element and the choice saved across refreshes. Test for a flash of the wrong theme on first paint.
- Components use semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`). A `dark:` variant is allowed only when a token cannot express the case.
- The editor surface, sidebar, dialogs, toolbar, remote cursors and sync badge must all be checked in both themes.
- Soft Indigo and other accent themes are future work.

---

## 14. Using the canvas in the repo

1. Open the canvas and export each artboard as an image (or a PDF), named by screen and variant, for example `dashboard-desktop-light.png`.
2. Put them in `docs/design/` and link the important ones from the README.
3. When a screen changes, update the canvas and this document together, and re-export.
4. Do not link the private canvas address in a public repo. The exported images are the shared artifact.

---

## 15. Design status and next batches

**Done in the canvas:** foundations, brand and logo, component variants, landing, auth, dashboard, dialogs, editor, tablet dashboard and editor, sharing (invite links), invite page, viewer, access states, settings, language switcher, sync states, empty and error states.

**Batch 2: honest status.** Logout dialog, Recovery pending, Sync error variants, cold-start state, banners, limit messages, the user menu, and dark versions of the sync and state boards.

**Batch 3: cleanup and parity.** Remove the superseded screens listed in [§8](#8-screen-inventory), make the dashboard row menu and editor header role-aware, update Settings and auth, and add the missing light, dark and tablet counterparts so every screen exists in both themes and at mobile and desktop sizes.

Until batch 3 is done, treat the "Still to draw" column in §8 as a to-do list, and build those screens from the tokens, components and rules in this document.
