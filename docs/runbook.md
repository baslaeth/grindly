# Setup and operations

## Current checkpoint

The six-screen foundation, database migrations, invitation redemption, and server-side email OTP integration are implemented. Hosted Auth/SMTP verification and GitHub CI are pending external access. Wallet proof and all later Phase 1 steps remain to be implemented in order. Phase 1 is not complete.

## Fresh checkout

1. Install Node 22.23.2 and pnpm 11.19.0.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm check` for lint, TypeScript, Vitest, PostgreSQL integration tests, generated-type drift, and production build.
4. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e`. An installed Chrome can be used with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.
5. Run `pnpm dev` and open `http://localhost:3000/join`.

On this Windows machine, installations require `$env:NODE_USE_SYSTEM_CA = '1'`. This uses the Windows trust store and keeps TLS verification enabled. Browser tests run a separate foundation-mode production server on port 3100 and never send real OTP emails.

## Supabase access and migrations

The project pins the Supabase CLI. Run `pnpm exec supabase login` to authorize it in the browser. After login, the implementation agent can inspect organizations/projects and create or link Grindly's single Supabase project. No account session is currently available.

For an existing empty project, link it using `pnpm exec supabase link --project-ref PROJECT_REF`, inspect `pnpm exec supabase db push --dry-run`, and then apply `pnpm exec supabase db push`. Do not apply `tests/database/bootstrap.sql`: it is an embedded-test fixture, not a hosted migration.

Populate server-only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in ignored `.env.local` from the project settings. Use the secret/service-role key only on the server. Public/anonymous and authenticated browser roles are denied direct table and RPC access.

PostgreSQL tests use PGlite with actual SQL permissions and constraints. They do not verify hosted PostgREST, Supabase Auth, concurrent database connections, or email delivery. Those checks must be recorded separately after connecting the project.

## Email OTP and SMTP

The user's SMTP provider must supply `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and the verified sender `SMTP_FROM`. Store them in ignored `.env.local`; do not send passwords in chat or commit them.

Configure the project's custom SMTP and set email OTP to six digits with a 600-second expiry. Use `supabase/templates/magic-link.html` for both the Magic Link and Confirm Signup templates. Keep email confirmations enabled, anonymous sign-in disabled, and refresh-token rotation enabled. Set the hosted Site URL to the exact `APP_URL`.

The local `supabase/config.toml` records the OTP and template settings. Local mail capture is not evidence of real SMTP delivery. Review `supabase config diff --project-ref PROJECT_REF` before any config push, especially Site URL and SMTP values. Default hosted SMTP is restricted to project-team addresses and is not sufficient for arbitrary invitees; see [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Set `GRINDLY_STAGE=auth` only once project credentials, migrations, and SMTP are configured. Restart the development server. The API requires an Origin header matching `APP_URL`; use `http://localhost:3000`, not the 127.0.0.1 alias, with the default local configuration.

## Invitations and verification

Run `pnpm invite --email person@example.com --days 7`. The script stores only a SHA-256 token hash in the database. The raw invitation code is written once to an ignored `.local/invitations/ID.txt` file for private delivery and is not printed to logs. Deliver it only to the named recipient. Do not commit those files.

The invitee enters their email and invitation code on `/join`, receives a six-digit email OTP, and enters it on the same screen. After joining, they can use Returning member for subsequent sign-ins. New member identity comes only from Supabase's server-verified user ID. An auth account alone creates neither a member nor an NFT entitlement.

Record actual results for valid, expired, revoked, reused, and wrong-email invitations. Test sign-out, refresh, returning-member sign-in, and confirm that authenticated accounts still cannot access research before wallet/NFT verification. Do not record OTPs, session cookies, invitation codes, or credentials in evidence.

`OTP_COOLDOWN_SECONDS` defaults to 60 and `INVITATION_MAX_OTP_REQUESTS` to 10. These limits are enforced atomically on invitation requests. Supabase Auth also enforces its own provider limits.

## GitHub and CI

Local commits are on `codex/phase-1`, authored as Codex. There is no GitHub remote yet. GitHub's connected app can read the account but this machine has no Git push credential. `git credential-manager github login --username baslaeth --browser` authorizes Git through the browser. The implementation agent can then create the Grindly repository, push the existing meaningful commits, and inspect the configured CI run.

The workflow includes lint, type checking, unit tests, database tests, generated-type drift, production build, and desktop/mobile browser tests. Contract checks will be added when the Hardhat package lands. Do not describe local checks as a successful remote CI run.

## Remaining live evidence

No contract has been deployed, no NFT has been issued, and ownership has not been verified on testnet. A later deployment manifest must record chain 46630, verified contract address, explorer URLs, ABI, deployment transaction, and independent app/RPC agreement. Mint, bind, transfer, transfer-away-and-back, epoch-bound promotion, and RPC-outage checks are still required before Phase 1 can be called complete.
