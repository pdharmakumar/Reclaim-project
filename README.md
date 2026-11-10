# Reclaim.

**Lost it? Let’s find it.** A campus lost-and-found with email/password accounts, private claims and messages, and a cream, charcoal, and electric-lime design.

## Run locally

Use Node.js 22 or newer and Python 3:

```sh
npm ci
npm run db:local
npm run dev
```

Open the Local URL printed by Wrangler. Keep the same hostname: `localhost` and `127.0.0.1` have different login cookies. The local database lives in ignored `.wrangler/` state; restarting the server preserves accounts and reports. No paid service, email provider, or API key is required for local development. A plain Python static server no longer runs the account backend.

## Try the demo without an account

Choose **Try the demo** in the header or on the login page, or open `/#/demo` directly. No signup, login, email, or backend is needed. Switch fictional identities in Profile to try both sides of a claim or conversation. Demo reports, photos, and messages stay in browser localStorage and are never uploaded to real accounts. Choose **Leave the demo** to return to the account flow.

The demo can also run with no npm installation:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/#/demo`. A static server supports the demo only; real accounts need Wrangler and D1.

## Accounts

- Create an account with a display name, email address, and an **8–128 character password**.
- Save the recovery code shown after sign-up. It is displayed once and allows a password reset; resetting rotates the code and revokes previous sessions. Reclaim does not send reset emails.
- Login uses a server-issued HttpOnly cookie. Passwords, recovery codes, and session tokens are hashed in the database. Credentials and private account data are never persisted in localStorage.
- Browsing and item details are public. Reporting, claims, messaging, and the profile require login. Email addresses stay private; public reports show display names.
- The server assigns every owner/sender from the session and checks all report, conversation, claim, and pickup permissions. Sample identity switching is available only in the separate local demo.

## Working features

Responsive navigation, search/filter/sort, item galleries, lost/found reports with optional photo uploads, report editing and removal, ownership claims, finder review, pickup confirmation, and private item-linked messaging. Reports and messages are stored in D1 and available across devices after deployment. Messages refresh every 15 seconds when the composer is empty; drafts are not interrupted by polling.

## Verify

```sh
npm test
```

This builds the static assets and Worker, then runs client checks and integration tests against the actual Workers runtime and an isolated D1 database. Tests cover the offline/no-account demo and its isolation, signup/login/logout, the 8-character minimum, session expiry, reset-code races, private-data filtering, ownership checks, concurrent claim approvals, pickup completion, CSRF checks, rate limiting, and stale responses after account changes. Test data is disposable and does not touch the local preview database.

`npm run check` checks source imports and JavaScript syntax. `npm run build` produces a clean `dist/` containing only public application assets. `worker/`, tests, migrations, credentials, and database files are never copied into that directory.

## Publish to the existing website

Follow [account deployment instructions](docs/ACCOUNTS.md). Configure the Cloudflare account that owns `reclaim.jesickle.workers.dev` and create/bind its D1 database before deployment. Deploy and remote-migration scripts refuse to run until explicit account and database IDs are configured. GitHub access by itself does not grant Cloudflare access.

The previous browser demo is preserved in existing localStorage keys but is not automatically uploaded or assigned to a new account. New server databases start empty. The example pickup locations must be confirmed with the campus before real use. Email is an unverified login identifier; this implementation does not claim school membership or provide school SSO. See [integration notes](docs/INTEGRATION.md) for the module map and remaining school-wide deployment work.
