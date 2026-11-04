# Repository inspection and integration plan

Inspected on November 2, 2026, before implementation. `main`, `origin/main`, `origin/Browse`, `origin/Reports`, and `origin/claims` all pointed to `4bed0df`. Every branch contained only `.gitignore` and a short README. The working tree was clean. No framework, package manifest, routes, components, authentication, backend, storage, database, or existing functionality was present. No branch was merged, reset, or pushed.

## Chosen architecture

This local application uses native browser ES modules, semantic HTML, and CSS. No dependency installation or compilation is required. Hash routes allow every page to work with a basic static HTTP server. This also avoids replacing any teammate’s framework, since none existed at inspection time. Main holds the shared shell and a working local integration demonstration. Feature owners can adopt or replace their corresponding modules without copying an entire application.

| Owner / branch | Modules | Responsibility |
| --- | --- | --- |
| Shared / main | `src/app.js`, `src/styles.css`, `src/icons.js`, `src/components/ui.js`, `src/data.js` | Navigation, design tokens, homepage, reusable presentation, public models |
| Browse | `src/pages/browse.js`, `src/pages/detail.js` | Query/filter/sort, cards, listing galleries, contact/claim entry points |
| Reports | `src/pages/reports.js` | Create/review, upload processing, edit, status, delete |
| claims | `src/pages/claims.js`, `src/pages/messages.js`, `src/pages/profile.js` | Private verification, transitions, messaging, pickup, demo identity |
| Shared backend contract | `src/service.js` | Validation, authorization rules, data operations, persistence |

Coordinate adoption with each branch owner. Have owners review their modules and the shared service contract, then integrate changes through normal reviewed PRs. Refresh remote refs before integration; the inspection reflects locally available refs, not a fresh network fetch. This implementation performs no automatic Git integration.

## Production work remaining

The application is a **browser-local demo**, not a secure multi-user service. Demo identities are intentionally switchable and localStorage is readable by anyone with access to that browser. The UI does not expose other participants’ private records, but JavaScript checks are not security boundaries. Never put actual verification secrets or sensitive student information into this demonstration.

1. Agree on school-approved authentication; map the authenticated server session to a stable user ID. Remove client-selected identities in production. Never accept creator or sender IDs from a request body.
2. Implement the service operations as authenticated server endpoints. Public item queries must return explicit public fields. Store ownership verification in private claim records. Authorize every item mutation, conversation read/write, claim read/transition, and pickup operation on the server.
3. Create database tables for users, items, item photos, claims, conversations, conversation participants, messages, and message read receipts. Use transactions for approval, pickup confirmations, and completion; enforce one approved active claim per item and unique active claimant/item pairs.
4. Replace photo data URLs with private/object storage and listing-scoped image URLs. Validate MIME, decoded contents, file counts, sizes, and dimensions server-side; re-encode images to remove metadata. Apply storage quotas and cleanup when reports are removed.
5. Replace local messaging with authenticated persistent APIs plus polling or a realtime channel. Only participants can subscribe. Use per-user read receipts and unread counts. Add rate limits and school moderation/reporting policies.
6. Replace example pickup spots with administrator-configured school-approved locations and timezone-aware times. Keep personal addresses out of the data model.
7. Add server integration tests for concurrent claims, authorization, uploads, pagination, and message subscriptions before production use. Carry forward the demo’s lifecycle tests.

The local service makes transactional copies before committing to storage, so quota errors leave state unchanged. Cross-tab storage events refresh the application. It does not support concurrent edits or multi-device delivery. A backend adapter will need asynchronous page loading/error states around the service contract; no fake latency or fake live messages are included here.

## Design and assets

Space Grotesk and Inter are optional Google Fonts with system fallbacks. Local sample product photos are downloaded from Unsplash. They are illustrative development samples, not actual school reports. See `public/ASSETS.md`. Lucide SVG icon paths are included locally with their ISC notice. All navigation and essential application behavior work without external services after the page is loaded.
