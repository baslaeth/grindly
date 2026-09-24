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

Complete inbox code verification and session checks, then continue Phase 1 Task 5 onward. Record each result only after it actually runs.
