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

Authorize Supabase and GitHub on this machine and supply SMTP settings through ignored `.env.local`. Then apply migrations to the single Supabase project, configure OTP delivery, verify real invitation/authentication behavior, publish the existing Git history and inspect CI, and continue Phase 1 Task 5 onward. Record each result only after it actually runs.
