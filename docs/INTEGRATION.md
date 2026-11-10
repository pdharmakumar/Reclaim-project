# Integration map

Reclaim uses native browser ES modules, semantic HTML/CSS, and hash routes. The account feature keeps the existing design and feature modules and moves identity, persistence, and permission checks to a same-origin Cloudflare Worker backed by D1.

| Area | Modules | Responsibility |
| --- | --- | --- |
| Shared shell | `src/app.js`, `src/styles.css`, `src/icons.js`, `src/components/ui.js` | Navigation, account route guards, design, reusable UI |
| Account UI | `src/pages/auth.js`, `src/pages/profile.js` | Sign-up, login, recovery, profile, logout |
| Browse | `src/pages/browse.js`, `src/pages/detail.js` | Public search and item details, contact/claim entry points |
| Reports | `src/pages/reports.js` | Create/review, photo processing, edit, status, removal |
| Claims and messages | `src/pages/claims.js`, `src/pages/messages.js` | Ownership review, transitions, pickup, messaging |
| Local demo | `src/demo-service.js` | No-account, browser-local sample data and identity switching; never uploaded |
| Client adapter | `src/service.js` | In-memory snapshots, serialized asynchronous writes, cross-tab account changes |
| Backend | `worker/auth.js`, `worker/domain.js`, `worker/storage.js`, `worker/index.js` | Session identity, validation, authorization, private response filtering, transactional persistence |

All mutations now return promises. Await them before changing routes, showing success, or rendering refreshed state. For real accounts, identity is selected by the server cookie; there is no switch-user endpoint. The explicit demo mode uses separate browser-local sample identities without authentication. Public user display details come from `service.user(id)` rather than the old seeded identity array.

Feature owners should review their modules and integrate through a reviewed PR. Existing teammate branches are left unchanged. Follow [ACCOUNTS.md](ACCOUNTS.md) before publishing; the account and database IDs must identify the existing hosting account.

For school-wide use, agree on verified school authentication and moderation, confirm pickup locations, add private/object image storage with server re-encoding and quotas, and introduce pagination/indexed record queries for larger datasets. Password recovery currently uses a saved recovery code rather than email. Existing browser-demo data remains local and is not silently imported into accounts.
