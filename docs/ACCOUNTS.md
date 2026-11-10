# Account backend and deployment

The existing native JavaScript frontend and hash routes are retained. A same-origin Cloudflare Worker serves `/api/*`; static application assets are served from `dist/`. Account and application data live in D1. There are no runtime service secrets or external email dependencies.

## Configure the existing Cloudflare account

The public URL is `https://reclaim.jesickle.workers.dev`. Use the account that owns its `reclaim` Worker, and verify its workers.dev subdomain is `jesickle`. Do not deploy to an unrelated account or replace an existing D1 binding without inspecting it.

```sh
npm ci
npx wrangler login
npx wrangler whoami
npx wrangler deployments list --name reclaim
npx wrangler d1 list
```

Set `account_id` in `wrangler.jsonc` to the verified owning account. If `reclaim-accounts` already exists, inspect and reuse its ID. Otherwise create it in that account:

```sh
npx wrangler d1 create reclaim-accounts
```

Put the returned `database_id` into the existing `DB` entry in `wrangler.jsonc`. Keep `database_name`, `binding`, and `migrations_dir` as supplied. Account and database IDs are resource identifiers, not passwords. `scripts/production-ready.mjs` prevents deployment and remote migration while either ID is absent.

## Validate, migrate, and deploy

```sh
npm test
npm run db:remote
npm run build
npx wrangler deploy --dry-run
npm run deploy
```

`db:remote` applies the schema to the explicitly configured remote D1 instance. It does not copy local test data. The migration creates new account, session, rate-limit, record, and revision tables; inspect an existing database for conflicting table names first. Deploy uses `--keep-vars` to preserve dashboard variables. No workflow auto-merges this feature or deploys it to production.

Verify the returned deployment URL is the existing `reclaim.jesickle.workers.dev` address. Then check:

1. Signed out: browsing works, `/api/state` returns `user: null` and empty private record arrays, and Profile/Report/Claims/Messages lead to login.
2. Create two disposable accounts in a staging environment. Confirm an 8-character password works and 7 characters fail. Save the one-use recovery codes.
3. Create a report as one account and claim/message it as the other in a separate browser profile. Check delivery and that an unrelated third account sees neither private claims nor messages.
4. Confirm logout and recovery invalidate the appropriate sessions. The production HTTPS cookie must include `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`.
5. Confirm existing assets load and no backend source or database files are served from the assets directory.

## Storage and security choices

- Password hashing uses native `node:crypto` scrypt (`N=32768`, `r=8`, `p=3`, random salts). Tokens and recovery codes use 256-bit randomness; only SHA-256 hashes are stored. Sessions expire after 30 days; logout revokes the current session, and recovery revokes all sessions atomically. Login rechecks the password hash during session creation to handle concurrent resets.
- JSON writes require the same Origin as the Worker. Cookies are host-scoped and HttpOnly; API responses are never cached. Authentication is limited by hashed IP/time-window and email/time-window keys in D1. Mutation limits are per account. No passwords, email addresses, bodies, or private records are logged by application code.
- Public snapshots expose listing fields and relevant users’ display names, with only the current account’s email. Claims, messages, and conversations are filtered by server-side participation checks. Client-provided owner or sender IDs are ignored.
- Mutations reuse the existing claim and listing rules on the server. A revision trigger and transactional D1 batches reject stale writes; retries reread and revalidate, preventing two approvals from winning or updates from silently overwriting each other.
- Each listing accepts up to six bounded inline JPEG/PNG/WebP photos (240,000 encoded characters each), checked for base64, type, signature, and size. The browser resizes/re-encodes images first. Server image re-encoding, object storage, moderation, quotas, pagination, and efficient large-dataset queries remain separate work before broader school rollout. This version reads the small campus dataset to apply its existing rules; it is not designed for an unbounded public marketplace.
- Email is not verified. Do not use it to grant school access or privileged roles. School SSO and email-based recovery are not configured. The recovery code is the only reset method; without it, an account cannot be recovered.
- Old demo storage is left untouched and never trusted as authentication or silently imported into shared storage. New databases contain no fictional reports or switchable identities.

Check the deployment plan’s CPU allowance with the password-hashing workload; local runtime tests do not establish production quota behavior. Logs/traces are enabled for operational diagnosis; review Cloudflare’s trace access/retention for the deployment’s audience.

API/configuration references: [Node crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Worker-first API routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
