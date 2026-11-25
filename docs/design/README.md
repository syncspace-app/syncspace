# Design screen map

Exported from the SyncSpace design canvas on 2026-11-25. Pictures are in `screens/`.
Rules, tokens, copy and component mapping live in `../design-system.md`. If a picture
and the spec disagree, the spec wins. Tell the team, and fix the picture.

**How to use (developers and Claude Code):** before building a screen, read its row,
open the listed pictures, and check the Notes column for outdated parts. Do not build
the parts listed under "Outdated parts". All pictures are light theme unless the name
says dark.

| Screen                       | Route                     | Pictures (in `screens/`)                                                                                                               | Main components                                                         | Notes                                                                       |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Foundations                  | n/a                       | `foundations.png`                                                                                                                      | tokens, type scale, radius                                              | Spec sheet, light only                                                      |
| Logo and brand               | n/a                       | `logo-and-brand.png`                                                                                                                   | Logo, favicon                                                           | Light, dark and indigo variants                                             |
| Component variants           | n/a                       | `components.png`                                                                                                                       | Button, Input, Badge, Avatar, ThemeSelector, Toast, Dialog, DocumentRow | Light only                                                                  |
| Landing                      | `/`                       | `landing-desktop.png`, `landing-dark.png`, `landing-mobile.png`                                                                        | Header, Hero, FeatureCard, HowItWorks, Footer                           | `landing-dark` is desktop. No tablet, no mobile dark                        |
| Sign in, register            | `/login`, `/register`     | `sign-in-register-reset.png`, `sign-in-and-settings-mobile.png`                                                                        | Card, Form, Input, Button                                               | See Outdated parts. Build sign in and create account only                   |
| Dashboard                    | `/dashboard`              | `dashboard-light.png`, `dashboard-dark-with-row-menu.png`, `dashboard-tablet.png`, `dashboard-mobile.png`                              | Sidebar, DocumentRow, RoleAwareMenu, SearchInput                        | Row menu is drawn for owners. Editors and viewers get Open only             |
| Dashboard dialogs and search | `/dashboard`              | `dialogs-and-search.png`                                                                                                               | Dialog (rename), AlertDialog (delete), search popover                   | Light only                                                                  |
| Editor                       | `/documents/[documentId]` | `editor-dark.png`, `editor-tablet-dark.png`, `editor-mobile.png`                                                                       | EditorToolbar, SyncStatusBadge, PresenceAvatars, remote cursors         | Share button is owner only (drawn for everyone). No light desktop picture   |
| Viewer editor                | `/documents/[documentId]` | `viewer-editor-desktop-light.png`, `viewer-editor-desktop-dark.png`, `viewer-editor-mobile-light.png`, `viewer-editor-mobile-dark.png` | Read-only banner, no toolbar, no Share                                  | Server also enforces read-only                                              |
| Share                        | editor                    | `share-dialog-desktop-light.png`, `share-dialog-desktop-dark.png`, `share-sheet-mobile-light.png`, `share-sheet-mobile-dark.png`       | Dialog, Drawer, Select, InviteLinkRow, CopyButton                       | Invite links only, no email. Owner only                                     |
| Invite page                  | `/invite`                 | `invite-page-states-light.png`, `invite-page-states-dark.png`                                                                          | Card, Button                                                            | Desktop only. Token is in the URL fragment. Signed-out state shows no title |
| Access states                | editor                    | `access-removed-deleted-not-found-light.png`, `access-removed-deleted-not-found-dark.png`                                              | Card, Button                                                            | Desktop only                                                                |
| Settings and theme           | `/settings`               | `settings-and-theme.png`, `sign-in-and-settings-mobile.png` (right half)                                                               | Tabs, Form, ThemeSelector, LanguageRow                                  | See Outdated parts. Light only                                              |
| Language switcher            | header, footer, settings  | `language-switcher-light.png`, `language-switcher-dark.png`                                                                            | LanguageSwitcher                                                        | Hidden until more than one language exists                                  |
| Sync status states           | editor header             | `sync-states.png`                                                                                                                      | SyncStatusBadge                                                         | Light only. Spec: design-system section 9                                   |
| Empty, loading, error        | various                   | `states.png`                                                                                                                           | Skeleton, Alert, Card                                                   | Light only. Includes session expired                                        |

## Outdated parts (do not build)

- `sign-in-register-reset.png`: the Reset password card, and the verification email
  helper text on register.
- `sign-in-and-settings-mobile.png`: the Forgot password link on sign in.
- `settings-and-theme.png`: the Verified badge and Change photo.
- Any Share button shown to an editor or viewer.
- The email-flow screens (verify email, check your inbox, old invitation card) are
  not in this folder.

## Still to draw

See design-system.md section 8: logout dialog, Recovery pending, sync error variants,
cold-start state, banners, limit messages, user menu, and light, dark and tablet
counterparts for many screens.

## Updating

When a screen changes, update the canvas, re-export that picture, and edit its row here
in the same pull request.
