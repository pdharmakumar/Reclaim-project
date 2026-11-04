# FOUND.

**Lost it? Let’s find it.** A responsive school lost-and-found application with a cream, charcoal, and electric-lime design system.

## Run locally

From this repository:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://localhost:4173** in a modern browser. Keep using the same hostname: `localhost` and `127.0.0.1` have separate browser storage. No Node, npm, API keys, paid services, or package installation is needed. Serve over HTTP; don’t open `index.html` directly from disk.

## Working features

- Editorial homepage, responsive navigation, shared cards, semantic forms, visible keyboard focus, and reduced-motion support.
- Search across title, description, brand, color, category, and location; combined type/category filters and newest/oldest sorting.
- Listing details and navigable multi-photo galleries.
- Lost/found reports, review before publication, drag-and-drop or device uploads, previews, removal, image processing, validation, and local persistence.
- Creator-only report editing, status management, and confirmed deletion.
- Private claim requests, finder review/approval/decline, configurable example pickup locations, confirmation by both participants, and completion that marks the item returned.
- Item-linked conversations, persistent messages, timestamps, read receipts, unread counts, and participant checks.
- Three switchable, explicitly labeled demo accounts.

## Demo boundaries

This is a **browser-local demonstration**, not a live school service. There is no backend, real authentication, or communication between devices. Data and processed image data URLs live in localStorage. Photos are optional, limited to six JPG/PNG/WebP files of 5 MB each, and resized to at most 1,000 px. Browser storage capacity varies; failed saves show an error and retain the prior state.

Use **Profile** to switch identities. For a full walkthrough:

1. As **Alex**, open Jamie’s headphones and request a claim with a distinguishing detail. Send a message.
2. Switch to **Jamie**, open Claims, start review, approve, and suggest a future pickup at an example location. Reply in Messages.
3. Switch back to **Alex** and confirm the arrangement.
4. As **Jamie**, mark the item collected. Its listing will show Returned.

These identities, items, and pickup locations are fictional examples. Demo permissions protect UI flows but cannot secure data against someone with browser access. Do not enter real personal or confidential information. Clearing the site’s browser storage resets the demo. Optional Google Fonts use system fallbacks if unavailable; icons and listing photos are served locally.

## Verification and static build

```sh
python3 scripts/check.py
python3 scripts/build.py
```

The build copies only application assets into ignored `dist/`. Native JavaScript modules require no transpilation. A Node-based lint/typecheck setup is not present; browser tests load the actual modules and verify behavior.

Browser tests run at `/tests/` (service lifecycle and permission checks) and `/tests/ui.html` (end-to-end interface and responsive checks). **Run tests in a separate browser profile or on a throwaway origin:** both reset local demo data. A passing run sets `body[data-test-status="passed"]` and prints the result count. The UI runner creates sample reports and uploads a generated PNG, switches accounts, sends messages, and completes a recovery.

## Collaboration and production integration

Work remains local on `main`; no push, branch merge, or deployment is performed. The initial repository and all feature branch refs contained only a README and `.gitignore`. Modules are separated for the Browse, Reports, and claims owners. See [the inspection and integration plan](docs/INTEGRATION.md) for exact boundaries, service contracts, and the authentication/database/storage work required before school-wide use.
