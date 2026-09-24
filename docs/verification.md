# Actual verification

## Foundation - 2026-09-23

- Dependencies installed with TLS certificate verification enabled.
- Exact dependency versions and pnpm lockfile recorded; no peer dependency conflicts.
- `pnpm lint`: passed, zero warnings.
- `pnpm typecheck`: passed.
- `pnpm test`: six environment-validation tests passed.
- `pnpm build`: passed; exactly six product routes, plus Next.js's standard not-found handler. Root redirects to Join.
- `pnpm test:e2e` using installed Chrome: 16 tests passed across desktop and mobile, including all six screens, no horizontal overflow, no page errors, root redirect, and illustrative sample labeling.
- Join desktop/mobile screenshots inspected. Browser screenshots are local ignored artifacts under `test-results/`.
- Playwright's bundled Chromium download timed out; the tests above used the installed Chrome channel instead.
- GitHub Actions workflow is configured but has not run remotely. No GitHub remote is configured.
- No Supabase authentication, NFT issuance, deployment, or membership access behavior is claimed by this foundation checkpoint.

## Schema and security - 2026-09-23

- SQL migrations apply to an empty embedded PostgreSQL database using PGlite, with a fixture supplying Supabase-managed roles and the minimal auth user table.
- 31 database integration tests passed: forced RLS, anonymous/authenticated read and insert denial on all 10 tables, schema creation denial, private function defaults, append-only audit events, exact uint256 values, cross-member wallet isolation, unique issuance, and pending-mint binding rejection.
- Generated TypeScript database types come from the migrated PostgreSQL catalog. CI checks for drift.
- `pnpm check` passed: lint, type checking, six unit tests, 31 database tests, generated-type check, and production build.
- These results exercise PostgreSQL permissions and constraints, not a hosted Supabase instance, Auth service, or PostgREST. Hosted verification is still pending credentials.

## Invitation and authentication checkpoint - 2026-09-23

- `pnpm check` passed: lint, type checking, 25 unit tests, 41 PostgreSQL integration tests, generated-type drift check, and production build.
- Database cases cover valid, expired, revoked, reused, wrong-email, unknown-code, and unverified-email invitation redemption; configurable OTP throttling; direct browser RPC denial; and no membership bindings or roles granted on joining.
- Unit tests cover server-verified identity, uninvited accounts, unconfirmed emails, changed email during OTP verification, sign-out after failed redemption, invalid OTPs, retryable provider failure, cookie/input rejection, CSRF origin checks, request size limits, safe error responses, and HTTPS origin validation. Auth-provider responses in these unit tests are explicit mocks, not live email verification.
- `pnpm test:e2e` passed 24 checks across desktop and mobile in the installed Chrome channel. These verify the six routes and the actual local HTTP API's failure behavior without service credentials, including cross-site request denial and no research disclosure from forged browser membership flags.
- Join desktop/mobile screenshots inspected after the form implementation. The disabled sign-in state is intentional until a real Supabase project and SMTP are configured.
- Live development preview started at `http://localhost:3000/join`; agent-browser confirmed meaningful content and no browser errors.
- Supabase CLI 2.117.0 is installed. `supabase projects list` reports that no access token is available. Local Supabase containers are unavailable because Docker/Podman is not installed; embedded PostgreSQL tests above do not need either.
- No GitHub push credentials are present in Git Credential Manager. No remote CI run, hosted migration run, SMTP delivery, real session refresh, wallet proof, contract deployment, mint, or transfer has been verified.

## Next required checkpoint

### Account setup progress - 2026-09-23

- Created the private GitHub repository `baslaeth/grindly` and connected it as the local `origin`. Existing commits are unchanged and have not yet been pushed; Git Credential Manager has no authorized account.
- Created the Grindly Supabase organization on the Free plan. Prepared the `grindly` project form; project creation is pending the owner's database password entry and submission.
- Rechecked Join and navigation to Workbench in Codex's built-in browser. Join correctly reports unavailable authentication without service configuration, and Workbench exposes no research content. This is not live authentication or NFT access verification.
- No Vercel deployment was initiated.

### Hosted schema and remote CI - 2026-09-23

- Pushed the existing commit history through `ca40be2` to private `baslaeth/grindly`, branch `codex/phase-1`, without rewriting it. Git uses the Windows certificate store with verification enabled.
- GitHub Actions run `35849010398`, job `107141968644`, passed installation, lint, type checking, unit tests, database tests, generated-type checking, build, Chromium installation, and end-to-end tests. Evidence: https://github.com/baslaeth/grindly/actions/runs/35849010398.
- Applied both committed migrations successfully via the SQL Editor on Supabase project `errbtterppmvtlfltgzp` (Seoul). CLI migration history has not yet been repaired; see the runbook before any future database push.
- Executed `scripts/verify-hosted-security.sql` on hosted Postgres. Result: `PASS: 10 forced-RLS tables; both browser roles denied table access and invitation RPCs`. The script actually attempts reads as each browser role, checks all table privileges, and rolls back. This does not claim PostgREST or live authenticated-session verification.
- Re-ran all 41 local database tests successfully.
- Supabase email settings report that custom SMTP is required before OTP templates can be edited. SMTP credentials remain missing. No live OTP delivery, wallet proof, deployment, mint, or transfer is claimed.

### Email infrastructure checkpoint - 2026-09-24

- Added the three Resend-provided records for `auth.grindly.io` in Porkbun: DKIM TXT at `resend._domainkey.auth`, CNAME `rsend.auth` to `rsend-apne1.forge.rmta.net`, and CNAME `send.auth` to `send.forge.rmta.net`. Existing root and wildcard website records were retained.
- All three records resolved publicly. Resend reported the domain verified and ready to send.
- Saved hosted email OTP settings: six digits, 600-second expiration. Email confirmation remained enabled and anonymous sign-in disabled.
- Existing Supabase publishable and server keys were stored in ignored `.env.local`; the application remains in foundation mode until SMTP setup is complete.
- Created a sending-only Resend key scoped to `auth.grindly.io`. The usage-limit interruption closed its one-time secret view before storage. The key is unused and must be replaced; no secret was committed or printed. On resumption, Supabase SMTP remained disabled.
- OTP templates, SMTP delivery, and real invitation/session verification remain pending. No live authentication or NFT milestone is claimed.

### SMTP delivery checkpoint - 2026-09-24

- The owner replaced the unused Resend key. The replacement was saved in ignored `.env.local` and Supabase custom SMTP, using `smtp.resend.com:465`, username `resend`, and sender `Grindly <noreply@auth.grindly.io>`. No key value is included in this record.
- Replaced both Confirm Signup and Magic Link/OTP email bodies with the committed code-only template, and set the subject to `Your Grindly sign-in code`.
- Started the local app in auth stage. Created a test invitation through the operator script against hosted Supabase; raw delivery details remain in the ignored local invitation directory.
- Submitted the actual Join form using the owner's designated test email. The app reached the code-entry state, and Resend reported the email delivered. Inbox code entry and server-side invitation redemption are not yet verified.

### Real redemption and wallet-proof checkpoint - 2026-09-24

- After the owner entered the delivered code, Join showed the authenticated member. A full page reload preserved the session. Workbench still showed only the membership-required state. This verifies real invitation redemption and session persistence, not NFT access or refresh-token rotation.
- Implemented injected-wallet connection through wagmi, SIWE challenge issuance, EOA signature verification, and atomic wallet binding. Member identity is derived exclusively from the server-verified session.
- `pnpm check` passed: lint, type checking, 45 unit tests, 50 PostgreSQL tests, generated-type drift check, and production build. Tests cover wrong domain, URI, chain, nonce, message, member and signer; expiry, replay, rate limits, active-wallet uniqueness, rollback, and browser RPC denial.
- `pnpm test:e2e` passed 28 desktop/mobile checks using installed Chrome, including wallet endpoint CSRF/input/authentication boundaries. These tests use the foundation stage, not a live wallet or hosted OTP.
- Applied `202609240003_wallet_proof.sql` through the hosted SQL Editor; it returned success. Catalog checks confirmed both wallet RPCs deny execution to anon/authenticated and permit service_role.
- Inspected the authenticated Join screen in the built-in browser: wallet controls render and desktop content does not overflow. The Connect action reports an unavailable injected-wallet connection. No real wallet signature has been approved or wallet binding claimed.
- Live wallet approval is the next required action, using a wallet-enabled browser. Contract implementation/deployment, real NFT mint/bind/transfer, and ownership-controlled access remain unfinished. User-provided untracked branding files were left untouched.

### Contract checkpoint - 2026-09-24

- Following the owner's wallet-verification report, reloaded Join and queried hosted table counts through the server credential without printing secrets or addresses. Join still offered connection; the database had one member, zero wallet challenges, and zero wallet bindings. Live wallet-proof acceptance remains unconfirmed, and no binding was fabricated to bypass it.
- Implemented `GrindlyMembership` using pinned OpenZeppelin 5.6.1, Solidity 0.8.34, and Hardhat 3.17.0. The issuer and metadata base are fixed at deployment. Issuance keys remain idempotent after transfer; changed recipients are rejected. Each mint/transfer, including self-transfer, advances the ownership epoch.
- `pnpm test:contract` compiled, type-checked the contract test project, and passed 11 Hardhat tests. Cases include issuer-only mint, retries, recipient mismatch, transfer away/back, stable metadata, approvals/operators, safe-transfer receiver rejection, rollback of failed issuance, configuration validation, and ERC721 interfaces.
- `pnpm check` passed lint, application types, 45 unit tests, 50 database tests, generated database types, all 11 contract tests, and production build. Contract compilation/type checking/testing is now included in CI.
- These are local simulated-chain results, not Robinhood deployment, source verification, NFT issuance, or live access verification. No app or contract deployment was initiated.

### Wallet clock-skew correction - 2026-09-24

- The owner's screenshot showed a connected wallet on Robinhood Chain testnet and a retryable server error. Reproduced the hosted challenge RPC error: `P0001: Invalid challenge lifetime`. The application clock was approximately 34 seconds ahead of the service response clock, outside the existing 30-second issuance tolerance.
- Added service-only `wallet_proof_clock()` in migration `202609240004`. Challenge creation and signature verification now use database time; atomic consumption continues to enforce database expiry. No expiry, replay, member-identity, or domain checks were removed.
- Applied the migration to hosted Supabase successfully. Retried the previously failing challenge issuance with authoritative time: accepted. Removed only the diagnostic challenge afterward; no wallet binding or signature was fabricated.
- `pnpm check` passed lint, type checking, 48 unit tests, 51 database tests, generated-type drift, 11 contract tests, and build. Added one further expiry regression and reran the full unit suite: 49 passed. Cases cover app clocks ahead/behind, database expiry despite a fresh local clock, and unavailable clock service.
- The database type generator now emits `Record<string, never>` for zero-argument RPCs instead of an empty object type. Live owner signature approval remains pending a retry after this fix.

### Live wallet-proof confirmation - 2026-09-24

- After the owner approved the ownership message, hosted Supabase reported one active wallet binding. Reloading Join showed `Wallet ownership verified` and the bound address. No private key, recovery phrase, or signature is stored in this evidence.
- Navigated to Workbench in the same authenticated session: it still rendered only `Active membership required`. Wallet proof alone does not unlock research. The current shell is locked; the later live NFT authorization check remains unimplemented.
- Checked available connected tools: no callable Vercel management connector was exposed. Installed/invoked Vercel CLI 59.26.0 using pnpm dlx; `whoami` reported logged out. Started the CLI device authorization flow and opened its authorization page for the owner. No deployment was created.

### Hosted app shell - 2026-09-24

- Vercel authorization confirmed. Created project `basla1/grindly` on the existing Hobby team, Node 24.x. GitHub auto-link reported a missing Login Connection; CLI deployment proceeded without auto-deploy integration.
- Deployed a Git archive of tracked commit `a203839`, excluding local credentials and untracked branding. Configured production APP_URL, auth stage, chain ID, and the three Supabase settings through secret stdin, then redeployed. No SMTP password or issuer key was uploaded for this auth-stage shell.
- Production deployment `dpl_Eg2RkoSTcxeaqLUySRvaQqbVd5tF` is READY at https://grindly-woad.vercel.app. The app manifest is `deployments/app-testnet.json`; this is not a contract deployment manifest.
- HTTP checks returned 200 for all six routes. Each displayed chain 46630; all five non-Join screens remained locked. Production wallet challenge POST rejected an attacker origin with 403 INVALID_ORIGIN and a same-origin anonymous request with 401 AUTH_REQUIRED. Inspected Join in the built-in browser: sign-in fields are enabled. No production OTP or production authenticated flow has yet been exercised.
- Generated a dedicated issuer key in ignored `.env.local`, without printing it. The public RPC returned chain ID 46630 and an issuer balance of zero. No deployment transaction was signed or sent.
- Requested free testnet gas from the official faucet for the issuer address recorded in the manifest. The faucet requires Cloudflare human verification and Google sign-in. Owner action is pending; no CAPTCHA bypass was attempted. Supabase's hosted Site URL still needs review for the production origin before completing the production auth runbook.
