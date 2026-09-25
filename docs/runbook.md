# Setup and operations

## Current checkpoint

The six-screen application includes the authorized research collaboration flow;
see `research-runbook.md` for reviewer appointments, demo policy, assignment and
isolated fixtures. Ten migrations are applied to hosted Supabase. Live token #1
transfer-back, fresh binding and access/identity checks passed. Demo promotion
invalidation, the complete production auth lifecycle and live concurrent/recovery
issuance evidence remain deferred. Phase 1 is not fully verified. The stable app
is https://grindly-woad.vercel.app; `deployments/app-testnet.json` records its source.

## Fresh checkout

1. Install Node 22.23.2 and pnpm 11.19.0.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm check` for lint, TypeScript, Vitest, PostgreSQL integration tests, generated-type drift, and production build.
4. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e`. An installed Chrome can be used with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.
5. Run `pnpm dev` and open `http://localhost:3000/join`.

On this Windows machine, installations require `$env:NODE_USE_SYSTEM_CA = '1'`. This uses the Windows trust store and keeps TLS verification enabled. Browser tests run a separate foundation-mode production server on port 3100 and never send real OTP emails.

## Supabase access and migrations

The single hosted project is `errbtterppmvtlfltgzp` in the Grindly Free organization. Browser access is authorized; the pinned Supabase CLI is not yet authorized. Run `pnpm exec supabase login` before using its remote management commands.

Migrations `202609230001`, `202609230002`, `202609240003`, `202609240004`,
`202609240005`, `202609250006`, `202609250007`, `202609250008`, `202609250009`,
and `202609250010` were applied through the signed-in SQL Editor. Before a CLI
push, link the project, inspect migration history, and register only missing
already-applied versions with `supabase migration repair --status applied` followed
by those version numbers. Do not rerun table-creation migrations against existing
objects. Inspect `db push --dry-run` before applying subsequent migrations.

Run `scripts/verify-hosted-security.sql` as the project database administrator to
check all 24 forced-RLS tables, browser-role read denial, absence of table
privileges, and invitation/research RPC denial. It ends with rollback and changes
no application data.

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

Returning sign-in always returns the same public response and intent-cookie shape without querying membership by email. Next.js `after()` schedules the same non-signup OTP provider request for every address after the response is sent. Provider throttling, unknown accounts, failures, and delivery latency are not exposed by this endpoint. Delivery is best-effort; the generic response is not proof that an email was sent. Membership is still enforced after OTP verification. Protected Route Handlers opt into writable auth cookies; Server Component reads remain read-only and use proxy refresh.

Record actual results for valid, expired, revoked, reused, and wrong-email invitations. Test sign-out, refresh, returning-member sign-in, and confirm that authenticated accounts still cannot access research before wallet/NFT verification. Do not record OTPs, session cookies, invitation codes, or credentials in evidence.

`OTP_COOLDOWN_SECONDS` defaults to 60 and `INVITATION_MAX_OTP_REQUESTS` to 10. These limits are enforced atomically on invitation requests. Supabase Auth also enforces its own provider limits.

## Wallet proof

After email sign-in, Join offers injected EVM wallet connection and a SIWE signature on Robinhood Chain testnet (46630). Use an EOA wallet; contract-account signatures are not supported by this checkpoint. This is a message signature, not a transaction or token approval. Neither connection nor proof grants research access without the later on-chain NFT check.

The server derives the member from Supabase's verified session. It issues a random, five-minute challenge for the exact configured APP_URL domain and Join URI. Issuing another challenge invalidates the prior one, with a five-per-minute member limit. Cryptographic verification precedes an atomic, service-only RPC that consumes the challenge, binds the address, and appends an audit event. An active wallet cannot belong to two members or be silently replaced.

Issuance and signature verification use `wallet_proof_clock()`, a service-only database time RPC. Atomic consumption checks that same database clock. This avoids rejecting legitimate proofs because a developer machine or app server clock is skewed; database expiry and replay checks remain mandatory. A clock-service failure is retryable and never grants a binding.

The initial injected-wallet connection issue was resolved and the owner's live wallet proof is recorded in the verification log. For another member, use a wallet-enabled browser at the exact configured URL, sign in, connect their own wallet, and approve only the Grindly ownership message. Never provide wallet recovery phrases or private keys.

## GitHub and CI

Commits are on `codex/phase-1` in the private repository `https://github.com/baslaeth/grindly`, connected as `origin`. Git Credential Manager is authorized. This checkout uses the Windows certificate store through repository-local `http.sslBackend=schannel`; TLS verification remains enabled. The original commit history was pushed intact and CI run `35849010398` passed all checks.

The workflow includes lint, type checking, unit tests, database tests, generated-type drift, contract compilation/type checking/tests, production build, and desktop/mobile browser tests. Do not describe local checks as a successful remote CI run.

## Contract development

Run `pnpm test:contract`. Hardhat compiles `contracts/contracts/GrindlyMembership.sol` using Solidity 0.8.34, optimizer 200 runs, Cancun EVM target, then checks TypeScript and runs the tests in `contracts/test`. Generated artifacts and caches are ignored. The first compile downloads the compiler with normal TLS verification.

Deployment requires a nonzero dedicated issuer address and a stable metadata base URL ending in `/`. These are fixed in the constructor. The server will use opaque random issuance keys, never member IDs or emails, as the public idempotency keys. An issuance retry returns the original token without minting again or reclaiming it from a transferee. Metadata URLs do not change on transfer. Epochs start at one and increase on every transfer, including self-transfers.

The verified deployment and ABI are recorded in `deployments/robinhood-testnet.json` and `deployments/GrindlyMembership.abi.json`. Never rerun deployment with a different issuer or delete the ignored deployment journal to work around a failed request. `scripts/deploy-membership.ts` resumes its persisted signed transaction. `scripts/verify-membership.ts` submits the exact compiler input to Blockscout.

## Issuance and membership

Set `GRINDLY_STAGE=membership`, `ROBINHOOD_RPC_URL=https://rpc.testnet.chain.robinhood.com`, and `MEMBERSHIP_CONTRACT_ADDRESS` from the verified deployment manifest. Supply the dedicated issuer key as server-only `ISSUER_PRIVATE_KEY`. The deployed contract's issuer must match. Never prefix server credentials with NEXT_PUBLIC or commit the ignored local environment.

Join offers Mint / check status after wallet proof. Each member/contract gets one durable operation and random issuance key. The database allocates issuer nonces atomically, persists the first signed transaction, and preserves it on retries. Only matching successful receipts with two confirmations become confirmed; then current ownership is read before binding. Pending or reverted operations never grant access. Existing owners can bind a token ID without minting.

Run `pnpm mint:reconcile` with the same server environment to resume unfinished operations in nonce order, including confirmed operations whose initial binding has not settled. Migration 006 adds `binding_completed_at`, written atomically with a mint binding, or when recovery is superseded by existing member/token binding history. Settled operations are not rebound on retries; explicit existing-token binding remains available to the current owner. On this Windows host also set NODE_USE_SYSTEM_CA=1. This command does not create new members, grant roles, or bypass chain checks. Reverted operations are terminal. Do not send unrelated transactions from the dedicated issuer while app minting is active.

All binding paths require two confirmations: current owner and epoch must also match at head minus one block. Newly minted/transferred tokens return retryable `OWNERSHIP_PENDING` until stable. Access checks still use latest ownership, denying former owners without waiting for confirmation depth. Binding SQL compares historical token epochs/blocks and member observations even after revocation. Ambiguous same-block switches to a different token are rejected; retry with a newer observation.

Workbench and My Membership call `requireActiveMembership()` for server reads. Owner and epoch are read at one explicit block, then the block hash is checked again. RPC failure is retryable and fails closed. A transfer or changed epoch denies the old binding; the recipient must authenticate, prove their own wallet, and bind the token. POST `/api/membership/check` is a same-origin, authenticated, protected audit mutation for verification.

Metadata at `/api/metadata/46630/TOKEN_ID` uses live ownership and exposes only token name, description, tier and network. Silver requires a current matching member/token/epoch binding and a non-revoked promotion whose approving member still has the steward role. All other valid tokens return Bronze. No email, member ID, wallet address, rationale or evidence is exposed.

## Remaining live evidence

### Vercel deployment checkpoint

The authorized Vercel CLI is invoked with `pnpm dlx vercel@59.26.0`. The linked project is `basla1/grindly`. Production source is the tracked commit in `deployments/app-testnet.json`, uploaded from an ignored Git-archive snapshot so local secrets and unfinished branding are not published. Production environment settings use the hosted APP_URL and existing Supabase credentials. Keep local APP_URL at localhost; do not pull production secrets over `.env.local`.

GitHub auto-deploy is not connected: Vercel requested a GitHub Login Connection. Existing Git pushes and GitHub Actions are independent and remain configured. Do not claim automatic Vercel deployments until this connection is actually verified.

The dedicated testnet issuer key is held in ignored local configuration and the production Vercel secret store. Its public address is in the app manifest. Never fund this development issuer with real assets. It has received faucet gas and deployed the verified contract. Keep the stable metadata origin under the app's production URL.

Deployment, source verification, real mint/retry/bind, current-owner access and
local RPC-outage denial/recovery are recorded in `docs/verification.md`. Hosted
Supabase Site URL is `https://grindly-woad.vercel.app`. Two independently
authenticated members completed transfer and transfer-back, fresh binding,
protected action/read revocation and identity/audit preservation. Promotion
invalidation/return, full production inbox/session lifecycle and hosted concurrent/
interrupted/reverted issuance remain deferred. Phase 1 is not fully verified.
