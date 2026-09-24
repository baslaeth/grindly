# Setup and operations

## Current checkpoint

The six-screen foundation, invitation redemption, email OTP, and wallet proof are implemented. Real OTP redemption and session persistence after reload are verified. Three migrations are applied to hosted Supabase. Wallet proof has local cryptographic/database tests; live wallet signing is pending a wallet-enabled browser. Contract issuance and all later Phase 1 steps remain. Phase 1 is not complete.

## Fresh checkout

1. Install Node 22.23.2 and pnpm 11.19.0.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm check` for lint, TypeScript, Vitest, PostgreSQL integration tests, generated-type drift, and production build.
4. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e`. An installed Chrome can be used with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.
5. Run `pnpm dev` and open `http://localhost:3000/join`.

On this Windows machine, installations require `$env:NODE_USE_SYSTEM_CA = '1'`. This uses the Windows trust store and keeps TLS verification enabled. Browser tests run a separate foundation-mode production server on port 3100 and never send real OTP emails.

## Supabase access and migrations

The single hosted project is `errbtterppmvtlfltgzp` in the Grindly Free organization. Browser access is authorized; the pinned Supabase CLI is not yet authorized. Run `pnpm exec supabase login` before using its remote management commands.

Migrations `202609230001`, `202609230002`, and `202609240003` were applied successfully through the signed-in SQL Editor. Before a CLI push to this existing project, link it, inspect migration history, and register these already-applied versions with `supabase migration repair --status applied 202609230001 202609230002 202609240003` if missing. Do not rerun them against existing objects. Then inspect `db push --dry-run` before applying subsequent migrations.

Run `scripts/verify-hosted-security.sql` as the project database administrator to check all ten forced-RLS tables, actual browser-role read denial, absence of table privileges, and invitation RPC denial. It ends with rollback and changes no application data.

For an existing empty project, link it using `pnpm exec supabase link --project-ref PROJECT_REF`, inspect `pnpm exec supabase db push --dry-run`, and then apply `pnpm exec supabase db push`. Do not apply `tests/database/bootstrap.sql`: it is an embedded-test fixture, not a hosted migration.

Populate server-only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in ignored `.env.local` from the project settings. Use the secret/service-role key only on the server. Public/anonymous and authenticated browser roles are denied direct table and RPC access.

PostgreSQL tests use PGlite with actual SQL permissions and constraints. They do not verify hosted PostgREST, Supabase Auth, concurrent database connections, or email delivery. Those checks must be recorded separately after connecting the project.

## Email OTP and SMTP

Grindly uses Resend with verified sending domain `auth.grindly.io`. Supabase custom SMTP is configured with host `smtp.resend.com`, port `465`, username `resend`, and sender `Grindly <noreply@auth.grindly.io>`. The SMTP password is a sending-only Resend key scoped to this domain. Configuration inputs are stored in ignored `.env.local`; do not print or commit secrets. The application sends OTPs through Supabase Auth, not a separate Resend SDK or email service.

Configure the project's custom SMTP and set email OTP to six digits with a 600-second expiry. Use `supabase/templates/magic-link.html` for both the Magic Link and Confirm Signup templates. Keep email confirmations enabled, anonymous sign-in disabled, and refresh-token rotation enabled. Set the hosted Site URL to the exact `APP_URL`.

The local `supabase/config.toml` records the OTP and template settings. Local mail capture is not evidence of real SMTP delivery. Review `supabase config diff --project-ref PROJECT_REF` before any config push, especially Site URL and SMTP values. Default hosted SMTP is restricted to project-team addresses and is not sufficient for arbitrary invitees; see [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Set `GRINDLY_STAGE=auth` only once project credentials, migrations, and SMTP are configured. Restart the development server. The API requires an Origin header matching `APP_URL`; use `http://localhost:3000`, not the 127.0.0.1 alias, with the default local configuration.

## Invitations and verification

Run `pnpm invite --email person@example.com --days 7`. The script stores only a SHA-256 token hash in the database. The raw invitation code is written once to an ignored `.local/invitations/ID.txt` file for private delivery and is not printed to logs. Deliver it only to the named recipient. Do not commit those files.

The invitee enters their email and invitation code on `/join`, receives a six-digit email OTP, and enters it on the same screen. After joining, they can use Returning member for subsequent sign-ins. New member identity comes only from Supabase's server-verified user ID. An auth account alone creates neither a member nor an NFT entitlement.

Record actual results for valid, expired, revoked, reused, and wrong-email invitations. Test sign-out, refresh, returning-member sign-in, and confirm that authenticated accounts still cannot access research before wallet/NFT verification. Do not record OTPs, session cookies, invitation codes, or credentials in evidence.

`OTP_COOLDOWN_SECONDS` defaults to 60 and `INVITATION_MAX_OTP_REQUESTS` to 10. These limits are enforced atomically on invitation requests. Supabase Auth also enforces its own provider limits.

## Wallet proof

After email sign-in, Join offers injected EVM wallet connection and a SIWE signature on Robinhood Chain testnet (46630). Use an EOA wallet; contract-account signatures are not supported by this checkpoint. This is a message signature, not a transaction or token approval. Neither connection nor proof grants research access without the later on-chain NFT check.

The server derives the member from Supabase's verified session. It issues a random, five-minute challenge for the exact configured APP_URL domain and Join URI. Issuing another challenge invalidates the prior one, with a five-per-minute member limit. Cryptographic verification precedes an atomic, service-only RPC that consumes the challenge, binds the address, and appends an audit event. An active wallet cannot belong to two members or be silently replaced.

The built-in browser's injected wallet connection was unavailable during live testing. In a wallet-enabled browser, open the exact localhost URL, sign in using Returning member, connect the wallet, and approve only the Grindly ownership message. Never provide wallet recovery phrases or private keys. Finish live verification before claiming Task 5 acceptance.

## GitHub and CI

Commits are on `codex/phase-1` in the private repository `https://github.com/baslaeth/grindly`, connected as `origin`. Git Credential Manager is authorized. This checkout uses the Windows certificate store through repository-local `http.sslBackend=schannel`; TLS verification remains enabled. The original commit history was pushed intact and CI run `35849010398` passed all checks.

The workflow includes lint, type checking, unit tests, database tests, generated-type drift, production build, and desktop/mobile browser tests. Contract checks will be added when the Hardhat package lands. Do not describe local checks as a successful remote CI run.

## Remaining live evidence

No contract has been deployed, no NFT has been issued, and ownership has not been verified on testnet. A later deployment manifest must record chain 46630, verified contract address, explorer URLs, ABI, deployment transaction, and independent app/RPC agreement. Mint, bind, transfer, transfer-away-and-back, epoch-bound promotion, and RPC-outage checks are still required before Phase 1 can be called complete.
