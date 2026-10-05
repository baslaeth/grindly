# Actual verification

## Launch policy local checkpoint - 2026-10-05

- Verified branch `codex/category-alpha-review`; 026 shared-applied, launch
  tables absent in a read-only shared RPC probe. No 027/028 shared write made.
- The 027-028-only prepared SQL transaction passed on a populated isolated
  PostgreSQL fixture: all existing table digests unchanged, forced RLS and
  browser-RPC assertions passed, old read path and new snapshot worked. A
  second execution stopped at the already-present guard.
- Focused isolated DB: nine category save pipelines/Unknown, daily/idempotent
  limit, legacy weekly award inclusion, independent work XP, High reserve and
  signed loss, transfer isolation, enhancement cap, reversal, appeal history,
  source monitoring/digest/reminder/acknowledgment, and old-table preservation.
  These are local transactional tests, **not** live shared-database journeys.
- Final `pnpm check` passed lint, types, 230 unit, 291 database, 11 contract
  tests, generated-type drift and build. Chrome foundation-mode Playwright
  passed 52/52 desktop/mobile tests. These are not a signed-in launch-member
  walkthrough.
- Local `http://localhost:3000/` served HTTP 200. Initial server lacked the
  repository's Windows TLS setting and showed an opportunity-service error;
  restarted only this project's server with `NODE_USE_SYSTEM_CA=1`. Home then
  showed the truthful empty genuine opportunity state. Public sample Home and
  public Grind Intelligence were inspected on desktop/mobile. Sanitized
  screenshots are in `docs/launch-review/` and contain no member records.
- Shared live award, reviewer appointment, prediction settlement, monitoring
  run/notification and signed-in launch screenshots remain **unverified** until
  027/028 activation, genuine staffing and a configured runner. No genuine
  alpha was submitted or future outcome fabricated. No production deployment.

The historical heading immediately below is retained for chronological
context; use the newest entry above for this launch checkpoint.

Historical checkpoint: **2026-09-25, Chat 05 confirmed-finding remediation** (see the final
section and `PROJECT_STATE.md`). Earlier entries are historical, not current
completion claims. Phase 1 remains incomplete pending live transfer-back and
the explicitly listed evidence gaps.

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

### Verified testnet contract - 2026-09-24

- Faucet funding confirmed by RPC: 0.01 testnet ETH. Deployed GrindlyMembership at `0xa1f055b20c1bcbd0fa63859154a1fa283f11c356` on chain 46630. Receipt succeeded with two confirmations; deployment transaction is `0x9972a0ce1c7a98aa83f4954a2d9c1d62569676bb9f377f662546e2cb38001d79`.
- Read deployed issuer and runtime bytecode back through RPC. Recorded receipt block/hash, runtime hash, compiler settings, constructor metadata base and ABI in `deployments/robinhood-testnet.json` and `deployments/GrindlyMembership.abi.json`.
- Submitted the exact Hardhat standard JSON compiler input to the explorer's verification API. It returned `Pass - Verified`. Explorer: https://explorer.testnet.chain.robinhood.com/address/0xa1f055b20c1bcbd0fa63859154a1fa283f11c356.
- The deployment script persists the signed transaction in an ignored local journal before broadcasting. No NFT has been minted yet. The metadata URL is stable but its endpoint is still the next implementation work, not yet serving tokens.

### Real issuance and access checkpoint - 2026-09-24

- Implemented durable operations, database-serialized issuer nonce allocation, first-writer signed-transaction persistence, broadcast retry, two-confirmation receipt/event reconciliation, and owned-token binding. Applied migration `202609240005` successfully to hosted Supabase.
- Local checks passed: lint/types/build, 61 unit tests, 61 PostgreSQL tests, 11 contract tests and the existing 28 desktop/mobile browser checks. PostgreSQL tests use a single embedded connection; they test reservation/idempotency/rollback semantics but are not multi-connection load tests.
- Used the authenticated Join UI to mint real token #1 in transaction `0xed42a02da45647ff78e65d1b126210df65fee9708ec1498c1aaf255e443f88cd`. While the operation was broadcast but unreconciled, Workbench remained locked. A subsequent Join status check reconciled the receipt and bound token #1 at epoch 1.
- Reopened Workbench after confirmation: the protected shell rendered `Research` / `No findings yet.` My Membership displayed Bronze, contract/token explorer links and the mint transaction. These pages call live ownership/epoch checks, not database-only membership flags.
- Local `/api/metadata/46630/1` returned 200 with Bronze and network traits, no member/email/wallet information, and no-store caching. A protected test mutation is implemented at POST `/api/membership/check`; its positive live call and the independently authenticated two-member transfer remain to be verified.
- Unit tests verify former-owner and stale-epoch denial, retryable chain failure, same-block reads with block-hash recheck, and Bronze unless current owner/binding and steward approval match. Actual live transfer, transfer-back, RPC outage and promotion invalidation evidence are still pending. Phase 1 is not complete.

### Membership deployment and outage recovery - 2026-09-24

- Deployed tracked commit `80079fc` to Vercel production as `dpl_89rzTpQcypGtpabYcpkaFqJZvSC9`. The stable app URL remains https://grindly-woad.vercel.app. Production now uses membership stage and the verified contract; issuer credentials remain server-only.
- GitHub Actions confirmed successful CI for this exact deployed commit: https://github.com/baslaeth/grindly/actions/runs/36015952070.
- Updated hosted Supabase Site URL from localhost to `https://grindly-woad.vercel.app` and confirmed it persisted after a dashboard reload. No redirect wildcards were added. Production OTP entry itself remains unverified.
- Production token #1 metadata returned 200 with Bronze and no personal data. Anonymous Workbench and My Membership remained locked; same-origin anonymous protected mutation returned 401.
- Repeated Mint / check status through the authenticated local Join screen: one database operation and on-chain `totalIssued = 1` remained. Binding existing token ID 1 also succeeded without another mint. The reconciliation operator command completed with no pending operations.
- The expanded browser suite passed 32 desktop/mobile checks using installed Chrome. These automated browser cases use foundation mode; they are not evidence of a second live member.
- Deliberately pointed only the local app's RPC setting at an unreachable localhost port. The authenticated Workbench showed a retry alert and no research content; metadata returned HTTP 503, code `CHAIN_UNAVAILABLE`, and `retryable: true`.
- Restored the real testnet RPC immediately afterward. Reloading the same authenticated Workbench restored `Research` / `No findings yet.` Production RPC settings were never changed during this test.
- Still required: a second independently authenticated member and wallet, actual transfer/transfer-back, protected mutation success/revocation, and stale promotion evidence. Requested the second member's email and public wallet address; no private key or recovery phrase is needed. Phase 1 remains incomplete.

### Second member ready - 2026-09-24

- Confirmed the second invitation was redeemed through email authentication and a second active wallet binding was created. The two active wallet bindings belong to distinct member IDs. No session, signature, or private key was copied between members.
- RPC still reports token #1 owned by the original wallet at epoch 1. Both participating wallets have zero testnet ETH; a live transfer has not yet been submitted. Sender faucet funding and personal wallet approval are required next.

### Live transfer and former-owner denial - 2026-09-24

- Sender faucet balance reached 0.01 testnet ETH. The owner then transferred token #1 in transaction `0x4b3ba025dbeef9364973787a6283b50bc134b0304d1c935db900c402dc4a35a9`, block `123681544` on chain 46630.
- At block `123681738`, same-block RPC reads returned recipient `0x50579Ca09e9F37B803Dd8e6906Ead7426F4893c7` and ownership epoch 2.
- Navigated the original authenticated member's browser to Workbench: `Active membership required`, with no research content. Join still showed the original email and verified wallet. The old database binding was still unrevoked at epoch 1, demonstrating that live ownership, not a database flag or sign-out, denied access.
- Metadata returned one retryable 503 chain-read error; a subsequent request succeeded locally and on production with Bronze and no personal data. No access fallback was introduced.
- Recipient binding is still pending. The connected Brave window did not expose the recipient's signed-in Grindly tab. Transfer-back, positive/negative protected mutation calls, and stale promotion checks remain outstanding; Phase 1 is not yet complete.

### Recipient binding confirmed - 2026-09-24

- The recipient reported successful binding and Workbench access in their independently authenticated Brave session. Hosted database verification confirms token #1 is actively bound to the second member at epoch 2; the original member's epoch-1 binding is revoked. The recipient's rendered Workbench was user-observed, not agent-observed.
- Submit Finding, Review Desk, and Contribution Record remain hard-coded membership-required placeholders; their later workflows and permission-aware states are not implemented. These placeholders do not indicate failure of the recipient's verified membership. Review authorization will additionally require the appropriate role and self-review prevention under frozen P0.

## 05 - QA & Security checkpoint - 2026-09-25

### Source and implementation

- Read frozen P0, architecture, Phase 1 checklist, and the prior verification record. Available architecture text and Git history contain only section 1. Missing approved sections cannot be restored from an unavailable source; flagged in the architecture document without inventing replacements. The Phase 1 checklist is a separate approved document, not a substitute for missing architecture sections.
- Submit, Review, and Contribution now call the same live membership gate. Current members see `Not available yet`; non-members see the membership denial; infrastructure failures remain retryable. No later research/review/contribution workflow or role privilege was implemented.
- Added `Check access` on existing Join controls, calling the already-implemented protected audit mutation. Member identity and binding remain derived on the server; the UI sends no member identity. No new screen, auth bypass, or chain was added.

### Passed automated checks

- `pnpm check`: lint, type checking, 77 unit tests, 62 database tests, generated-type drift check, 11 contract tests, and production build passed. The first run failed on strict TypeScript indexing in the new test fixture; the fixture was corrected and the complete command rerun successfully. No remaining failed automated check at this checkpoint.
- `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome pnpm test:e2e`: 34 tests passed across desktop/mobile, including all six routes and denial on unfinished screens. These use a foundation-mode server, not hosted authentication or a live wallet.
- `tests/unit/membership-security.test.ts` uses predicate-aware database doubles to check the real protected action and metadata service: session-derived audit identity, former owner, stale return epoch, another member's binding, cross-origin rejection, RPC failure, audit-write failure, and stale member/binding/contract/token/epoch/revocation promotions. These are mocked chain/database tests, not live promotion approvals.
- `tests/database/issuance.test.ts` now exercises real embedded PostgreSQL transfer/rebinding with two distinct members, two nonempty audit fixtures, a steward role, and a nonempty explicitly labeled synthetic promotion. All pre-existing fixture rows retain their identities/attributions and content after simulated transfer-back; the old promotion no longer joins an active binding. This does not test findings, XP, points, reputation, rank, or earned balances: those histories are not implemented.

### Passed live checks (local app, hosted Supabase, chain 46630)

- Rechecked the actual token: owner remains the second wallet at epoch 2. Its native testnet gas balance was zero. Requested faucet funding only; no return transfer was submitted or signed by the agent.
- Connected to the recipient's actual Brave tab, independently authenticated as the second member. Agent-observed Workbench `Research` and My Membership `Bronze`/token #1. Original member in the separate built-in browser remains authenticated but is denied on both routes.
- Exercised the actual Join `Check access` in both browsers. Recipient succeeded; former owner received `Active membership required`. Hosted audit query returned exactly one `membership.protected_check`, attributed to the recipient, and none for the denied sender.
- Agent-observed Submit, Review, and Contribution for both sessions: current owner gets the unavailable placeholder, former owner gets membership denial. This verifies authorization and truthful placeholder state, not later workflow correctness.
- Captured a pre-return, hash-only local baseline in ignored `.local/qa-transfer-baseline.json`: two member records, two wallet bindings, and eight existing audit events. It contains no session credentials. **Preservation across the live return is not yet tested**; this is only the baseline. Local fixture preservation above is the separately verified result.

### Untested / blocked / not applicable

- **Blocked:** actual transfer-back of token #1 from the second wallet to the first, denial before fresh epoch-3 binding, rebind, post-return protected reads/actions, and comparison of the nonempty live audit baseline. Requires second-wallet faucet gas and then one exact user-approved NFT transfer. Do not request or use private keys. Do not mark Phase 1 complete yet.
- **Untested live:** a nonempty steward-approved promotion surviving in the database while its old token/epoch becomes invalid. Automated predicate and database tests pass, but no genuine human promotion or approved demo persona was created on hosted data. Existing Bronze alone is not evidence of invalidating a nonempty live promotion.
- **Unavailable source:** architecture sections beyond the supplied stack section. Owner asked to provide the approved original text; no invented restoration.
- **Other residual QA gaps:** hosted multi-connection nonce contention, interrupted/reverted issuance service orchestration under concurrent requests, production-origin OTP completion, and a deliberate refresh-token rotation/sign-out/returning-sign-in cycle are not claimed by this run. PGlite is single-connection and browser CI uses foundation mode.
- **Not implemented / not preservation evidence:** findings, versions, awards, XP/points, balances, contextual reputation, review and assignment/payment history. Their empty/absent state must never be called a passing transfer-preservation test.
- This checkpoint's UI/test changes are local/Git only. Vercel still runs source `80079fc` recorded in `deployments/app-testnet.json`; it does not yet include this checkpoint's placeholder correction or Check access control.

## Chat 05 confirmed-finding remediation - 2026-09-25

Independent review of `2d46ca7` confirmed five defects. The following are corrections, not new product workflows.

1. **Existing-token confirmation bypass:** `readConfirmedOwnership()` requires owner/epoch at latest and at head minus one to agree. A token nonexistent at the confirmed block, or a new ownership epoch, returns retryable 409 `OWNERSHIP_PENDING` without calling the binding RPC. Normal mint and explicit binding share the two-confirmation constant; protected reads still check latest ownership for immediate revocation. Regressions in `tests/unit/ownership.test.ts` exercise the real binding service with explicit 100/99 block reads and prove no RPC binding on insufficient depth.
2. **Interrupted confirmation-to-binding:** reconciliation now includes confirmed operations with null `binding_completed_at`. Migration 006 writes that marker atomically with initial mint binding, or settles recovery without binding when member/token binding history already exists. This protects later legitimate explicit rebinding, even when revoked. Legacy mint bindings are backfilled as settled. Tests cover interruption after receipt persistence, retry without another signature, duplicate completion, preserved active/revoked later bindings, pending/reverted handling, and concurrent callers broadcasting the first persisted signed transaction only.
3. **Historical stale observations:** migration 006 replaces active-only checks with token epoch/block and member block history checks under the existing token/member locks. Old observations arriving after newer rows were revoked are rejected. Same-epoch refresh advances the high-water mark; ambiguous same-block switches to a different token are rejected. Database regressions cover these cases with real SQL/constraints.
4. **Dropped refreshed cookies:** protected membership and wallet Route Handlers opt into writable cookies through session verification. Server Components remain read-only and use proxy refresh. `session-refresh.test.ts` exercises the real protected route/session/client adapter with simulated provider rotation and response-cookie chunks, then a subsequent protected request using those updated cookies. It does not claim an actual production expiry/refresh cycle.
5. **Returning-email enumeration:** removed member-email eligibility lookup. Every valid returning email follows the same response and intent-cookie path; identical non-signup Supabase requests run in Next.js `after()` after the response. Provider errors, throttling and delivery latency cannot select an application response path. Regressions cover member/nonmember inputs, 400/429/500/success results, thrown network errors and unbounded provider latency; membership still requires server verification after code entry.

### Automated and deployment preparation results

- `pnpm check` passed on the final source: lint, type checking, **92 unit**, **68 embedded PostgreSQL**, **11 Hardhat contract** tests, generated-type drift, and production build.
- Chrome Playwright suite passed **34 desktop/mobile** tests. `git diff --check` passed. No outstanding automated failure is being hidden by a skip.
- Applied `202609250006_qa_membership.sql` successfully to hosted Supabase through the signed-in SQL Editor. Service readback confirms the legacy confirmed operation has a populated completion marker. Generated TypeScript types include the new column. No new member, role, promotion, token transfer, or fabricated wallet proof was created.
- Concurrency orchestration uses deterministic provider/database doubles; SQL tests use single-connection PGlite. These are focused automated regressions, not proof of hosted multi-connection contention or real reverted/interrupted recovery. Production response-cookie transport still needs the live auth cycle.
- Corrected tracked source will be deployed before any new live verification. The following deployment entry records its exact commit and outcome. No local secrets, signed transaction journal, `docs/brand/`, or untracked `public/` assets are included in the deployment archive.

### Remaining live acceptance (not passed by these fixes)

- A: fund the second wallet if necessary, request one approved token #1 return transfer, verify epoch/stale denial/fresh rebind and protected reads/actions, then compare existing member/wallet/audit attribution against the saved nonempty baseline.
- B: create a clearly labeled test/demo Silver promotion with nonempty evidence as explicitly authorized; verify valid Silver, transfer Bronze, unchanged promotion attribution, and no automatic Silver revival after return/rebind. Do not describe test evidence as earned reputation.
- C: production OTP, returning sign-in, deliberate expired-session refresh, sign-out, and direct protected DB/RPC denial from an authenticated browser context.
- D: real concurrent issuance and interrupted/reverted recovery on chain 46630. No mainnet transactions; no bypass of personal wallet approval.
- Findings, reputation, XP, points, ranks and earned balances are unimplemented and are **not** claimed as preserved. Phase 1 remains incomplete until the remaining required live evidence is recorded.

### Corrected deployment result

- Pushed corrected source commit `f3c8bad4b017e2ed49b44bdae641642399b49e7a` on `codex/phase-1`. Deployed its tracked-only Git archive to Vercel after the passing final suite and migration 006 application. Deployment `dpl_AbRr3XPDP7o3J38tQXmaanQiRqBB` is READY, URL https://grindly-abwekg65c-basla1.vercel.app, stable alias https://grindly-woad.vercel.app. `deployments/app-testnet.json` records the exact source; the later deployment-record commit is documentation only.
- Post-deploy smoke: production Join 200, token #1 metadata 200, anonymous same-origin protected mutation 401 AUTH_REQUIRED. These are availability/anonymous boundary checks, not completion of live production auth or transfer acceptance.
- Post-deploy prerequisite read: chain ID 46630; token #1 still owned by the second wallet; that wallet's testnet ETH balance is zero. Stop for its faucet funding before requesting a single return-transfer approval. No live test/demo promotion was created yet, no NFT moved, and no auth/session history was fabricated.
- Independent Chat 05 re-review target is source `f3c8bad` plus the deployment-record documentation commit. Remaining live A-D acceptance is explicitly pending. Original untracked branding/public assets remain untouched and excluded.

## Live A complete; live B valid-demo baseline - 2026-09-25

- Member 2 funded their wallet and personally approved token #1 returning to Member 1. Return transaction `0xcc6c19d3011c5e4b98750a1a2ff42e145ba2e516b1c45ce45aa008195dd41a0e` was observed in block `123818192`. Same-block reads at `123818441` on chain 46630 returned original owner `0xbbB383F167cfb3C848f111f2976c1820d88B9Edb`, epoch 3.
- Before rebinding, both independently authenticated browsers were denied Workbench and the protected Check access mutation. Member 2 still had an unrevoked epoch-2 database binding at this point, but latest on-chain ownership denied access. Member 1's old epoch-1 binding did not revive on return.
- Submitted existing token ID 1 in Member 1's actual Join UI. The corrected confirmation gate accepted it; a fresh epoch-3 binding was created. Member 1 then passed the protected mutation and read Workbench/My Membership (Bronze); Member 2 continued to fail both reads and mutation. Audit readback contained one successful action for each member at their own respective binding, with no audit entry for the denied attempts.
- Compared every row digest in the saved nonempty `.local/qa-transfer-baseline.json` before AND after fresh binding: both member records, both wallet bindings, and all eight pre-existing audit events remained unchanged, including attribution. New events were allowed, not reassigned. This proves preservation of those existing Phase 1 records only, not findings/reputation/XP/points/balances or other unimplemented histories.
- Live browser reads/actions used independent localhost sessions running corrected source `f3c8bad`; the corrected production deployment was already READY before testing. This is not a completed production-origin authentication lifecycle (live C remains pending).

### Live B: explicitly labeled fixture, not earned promotion

- Under the owner's explicit authorization, created demo promotion `72057bb3-9d84-42a4-9a0b-cdb2be12cd2d`, bound to Member 1/token #1/epoch 3/binding `8ee6e16e-07d4-4ef3-8d9c-74cfc81775dd`. Rationale begins `TEST/DEMO ONLY`; evidence is a nonempty synthetic QA array with `demo: true`, expressly claiming no findings, XP, points, or earnings.
- Member 2 received a temporary test steward role solely to satisfy the real approval constraint (different member from the recipient). Created append-only `qa.demo_steward_granted` and `qa.demo_promotion_created` events with demo labels. No genuine research promotion or earned reputation is claimed.
- Production metadata returned HTTP 200 with Silver. Agent-observed Member 1's local My Membership page displayed Silver. Captured the full promotion row digest for comparison in ignored `.local/demo-silver-epoch3.json`; no session credentials are in that journal.
- **Still required for B:** user-approved transfer to Member 2, production Bronze and unchanged promotion row/attribution, then user-approved return and fresh rebind with no automatic Silver revival. Leave the promotion non-revoked and the test steward role in place during these checks so invalidation is genuinely due to binding/ownership epoch, not removal of approval.
- **Cleanup required after B:** revoke only this demo promotion, remove only the temporary test steward grant introduced here, and append demo cleanup audit events. Journal records fixture/audit IDs and `roleAddedForTest: true`; preserve all historical audit records. Live C and D remain untested.

## Authorized research collaboration checkpoint - 2026-09-25

### Authority, retained evidence and fixture retirement

- The owner's latest authorization explicitly permits research implementation
  while deferring B's live promotion-invalidation/return test. `research-scope.md`
  records the sole new product addition: one Workbench discussion thread. Frozen
  P0 and the available approved stack were not replaced. Missing architecture
  sections remain flagged; obsolete stop-before-research instructions were updated.
- **Live A remains passed**, including epoch-3 return, stale denial, fresh binding,
  protected reads/actions and nonempty member/wallet/audit digest preservation.
  No completed check was reset to unverified and no further user token transfer
  was requested or performed by this implementation.
- Retired only demo promotion `72057bb3-9d84-42a4-9a0b-cdb2be12cd2d` and the temporary
  Member 2 steward grant after verifying their fixture provenance and absence of
  other active approvals. Appended `qa.demo_fixture_retired` and
  `qa.demo_steward_retired` events. Original promotion and audit rows remain.
  Token #1 metadata now returns Bronze. This is deliberate fixture cleanup, **not**
  evidence of ownership-driven promotion invalidation.

### Implementation and hosted database

- Implemented the six-screen discussion -> finding -> correction -> independent
  review -> recognition -> evidence brief loop. No additional product screen,
  contract, chain, queue, chat service, LLM or token was introduced. Existing logo
  was reused; unrelated brand assets remain untouched.
- Applied migrations 007-010 to hosted Supabase. The final 010 function includes
  consistent finding-before-assignment locks and preserves correction/dispute
  work state during delivery. The hosted SQL editor returned success.
- `scripts/verify-hosted-security.sql` returned **PASS: 24 forced-RLS tables; both
  browser roles denied table access and invitation/research RPCs**. This is an
  administrator-executed grant assertion, not the still-deferred production
  authenticated browser auth/denial lifecycle.
- Service routes derive actor from session, require live token ownership/epoch,
  persist refresh cookies, validate origin and strict payloads, and filter
  permissions before assembling summaries. Versions and awards are append-only;
  exact-version acceptance and the initial unique-finding award are transactional.
- Silver prerequisites are configurable demo values, not automatic promotion or
  a universal reputation score. The single fixed-fee assignment is explicitly
  unfunded, testnet-only/no monetary value, with work separate from payment.

### Automated results and resolved failures

- Final `pnpm check`: **passed** lint, types, **99 unit**, **111 embedded PostgreSQL**,
  **11 contract** tests, generated-type drift and production build. Build exposes
  exactly the six intended product routes plus internal APIs/framework fallback.
- Final Chrome `pnpm test:e2e`: **38 passed**, desktop/mobile. `git diff --check`
  passed. These foundation-mode tests are not an authenticated live journey.
- Focused tests cover persistent messages/replies and source authorship, immutable
  versions, private profile/content/review/count leakage, self/scope/conflict
  boundaries, demo/real reviewer isolation, idempotent awards/revisions, rollback
  on award failure, stale reviews, independent disputes, source lineage and brief
  updates, Silver prerequisites, and correction propagation without payment.
- During development a promotion SQL alias collided with a PL/pgSQL row variable;
  migration 010 fixes it, with a successful assessed-promotion regression. Initial
  live browser attempts failed ambiguous reply/decision selectors and an overly
  short test timeout; selectors were scoped and the timeout adjusted. Final runs
  passed. Failed attempts remain visibly labeled QA records, not hidden successes.

### Authenticated live research QA (local application, hosted services)

- Provisioned three isolated `grindly-qa-research-*@example.test` personas via
  Supabase-generated QA OTPs, normal auth verification, signed challenges using
  generated test wallets, and the ordinary durable mint/bind API. Real chain-46630
  tokens #2, #3 and #4 confirmed. Existing user token #1, identities and sessions
  were not substituted. Private fixture keys stay in ignored `.local/` only.
- All fixture profiles carry an operator-controlled `is_demo` label. Their
  reviewer scopes are explicitly synthetic-only, audited, and cannot read
  restricted genuine findings or review genuine authors. No genuine reviewer or
  steward appointment was invented.
- `pnpm exec playwright test --config playwright.research.config.ts`: **2 passed**
  in 5.2 minutes, desktop and mobile, using three separate fresh authenticated
  contexts. Each persists another specialist's message, replies, creates an
  attributed finding, requests correction, submits v2, accepts as an assigned
  different reviewer, retries acceptance concurrently three times, verifies one
  25-XP/25-point award, records complementary use and checks the brief/history.
- Successful local finding IDs: desktop
  `2d9aefe5-385a-491e-b222-39901acec70b`; mobile
  `68ee35d8-0474-44a4-b42a-cf9b03ffe554`. Tests assert no browser errors and no
  horizontal overflow. Screenshots were inspected; the built-in browser also
  rendered the genuine original member's protected Workbench on desktop/mobile.
- Separately seeded one coherent, **explicitly fictional** three-specialty
  scenario with source reuse/usefulness and synthetic independent-identity
  decisions. Project finding `0d57868c-5ada-4138-a906-142478520beb`, risk finding
  `0a686074-54b4-42f7-9224-2c4bebe7bc4e`, operations finding
  `8a31c77b-b1e7-4281-a42f-e7c2576ad903`. This service-side demo seed is not live
  human review evidence or customer validation. Demo labels remain in the brief.

### Still incomplete or deferred

- B transfer-invalidation/return/no-revival; C full production inbox/auth refresh/
  sign-out/direct-authenticated-denial cycle; D concurrent/interrupted/reverted
  issuance remain explicitly deferred/unverified. QA-generated OTPs, sequential
  minting and concurrent review retries do not satisfy those separate checks.
- Genuine reviewer/steward roster requires owner designation. Genuine work can
  be submitted but stays pending without authorized staff. Real human promotion,
  peer-request use and dispute resolution are not claimed from synthetic tests.
- No customer validation, funded customer assignment, payment or investment
  return. Previously nonexistent histories are not retroactively called preserved.
- Embedded database tests are single-connection. Wider hosted review/correction/
  dispute/delivery contention is a remaining independent QA target. Phase 1 is
  not fully verified and the product is not declared production-ready.
- Deployment and post-deployment evidence follow below once the tracked release
  is ready. Independent re-review instructions: `QA05_RESEARCH_HANDOFF.md`.

### Deployment verification and session-route follow-up

- Deployed tracked `fd87bcae44f8f2495939a223b279bbfbfa91bcbb` as READY
  `dpl_13AKXSAj9y8VkrdVaBSibnRNHe19`. GitHub CI for that exact source passed:
  https://github.com/baslaeth/grindly/actions/runs/36131815941. The runner reports
  an existing Node-action runtime deprecation warning, not a failing check.
- Production anonymous `/api/research` returned 401 `AUTH_REQUIRED`. The first
  fixture OTP verification assertion failed before research; its error code was
  not captured. Added safe status/code diagnostics (no OTP/cookie output). A rerun
  then passed the whole production desktop journey in 2.0 minutes: finding
  `f99ec88a-f5e6-400a-bfaa-c4178d8d6daf`. The initial cause is not established;
  success is not a claim that the deferred real-inbox/auth lifecycle is complete.
- Final inspection found the new `/findings/*` routes missing from the existing
  session-refresh proxy matcher. Added the matcher and a regression using the
  installed Next.js matcher utility. The utility is still exported under its
  middleware name despite the bundled guide's proxy name; adjusted the test and
  server-only marker mock after initial type/import failures. No production auth
  check or membership gate was weakened.
- Full `pnpm check` after this correction passed **100 unit**, **111 database**,
  **11 contract** tests, lint/types/type drift/build. The final deployment below
  supersedes `fd87bca` and includes the route correction.

### Final tracked deployment and honest verification boundary

- Executable source `fa031345495725603d4dcbc914fb5078f08683a2` deployed READY as
  `dpl_PiMbt2Yq2dzg5pVpMWBzBypV8vrd`, immutable URL
  https://grindly-8gcmcy9kg-basla1.vercel.app, alias
  https://grindly-woad.vercel.app. `deployments/app-testnet.json` records it.
  Its GitHub CI passed: https://github.com/baslaeth/grindly/actions/runs/36132653123.
- Final complete local checks passed again: **100 unit, 111 database, 11 contract**,
  lint/types/type drift/build; Chrome foundation suite **38 passed**; diff checks
  clean. Built-in browser inspected the current original member's Workbench and
  the attributed, labeled demonstration record. Local server is left running.
- The final deployed-source live rerun initially identified `400 INVALID_OTP`
  during isolated fixture setup. Returning-email delivery and the administrative
  QA-code generation are separate asynchronous issuances. The test now separates
  them with a wait and permits at most two regenerations only for `INVALID_OTP`.
  It logs status/code, never OTPs or cookies. Application authentication is unchanged.
- Subsequent production fixture authentication succeeded. One journey attempt
  failed on submission with the visible **Ownership check unavailable. Please
  retry.** alert. Vercel request logs confirm a 5xx POST `/api/research`; the live
  ownership gate failed closed before the write. This is an availability failure,
  not a passing full journey and not grounds to bypass ownership.
- One final full rerun persisted a finding and correction request, but timed out
  waiting 20 seconds for the correction form. Its precise cause is unestablished;
  it is recorded as **failed**, not assumed to be RPC-related or called a pass.
- Consequently the complete local authenticated desktop/mobile journeys and the
  earlier full production `fd87bca` journey remain passed, while a clean complete
  production rerun on final `fa03134` remains **unverified after failed attempts**.
  Chat 05 should investigate hosted latency/retry behavior and repeat that run.
  No blind retries, disabled assertions or ownership fallback were added to claim
  success; only explicitly isolated QA OTP setup retries were introduced.
- Post-deploy token #1 metadata returned 200 with Bronze and chain-46630 traits.
  This remains deliberate demo-retirement evidence, not transfer invalidation.
- Final evidence/test/manifest commits do not change the deployed application.
No secrets or unrelated brand assets are committed. Stop here for independent
  QA and functional UI annotation. Genuine reviewer/steward appointments, funded
  work and the explicitly deferred Phase 1 B/C/D checks remain outstanding.

## 2026-09-25: QA05 focused research remediation

Baseline: Chat 05 review commit `3623a77` and `QA05_RESEARCH_REVIEW.md`.
No new product feature, research workflow, contract, transfer or brand redesign.
Preserve the independent review's passed local desktop/mobile and production
desktop journeys on `fa03134`; those supersede the earlier missing clean rerun.
The historical ownership 503 was not reproduced; its root cause is still unknown.

### Confirmed defects and regression evidence

| QA item | Correction and evidence |
| --- | --- |
| 1. Demo disruption | Migration 011 rejects incompatible dispute/usefulness actors before inserting or changing state. Both demo/real directions compare the full nonempty snapshot, accepted brief, assignment and audit rows before/after rejection. Routing/review/promotion apply the same boundary. |
| 2. Synthetic promotion evidence | Immutable historical incompatible uses remain visible and attributed but `qualifies=false`; counts and promotion prerequisites use that filter. Demo usefulness is visibly labeled. Steward/candidate compatibility is checked before decisions, including a promotion-table trigger. Both candidate directions and demo-steward rejection pass. |
| 3. Private lineage | Snapshot redacts inaccessible `related_version` per recipient. Both project/risk audience directions assert hidden claim, source URL, finding ID and version ID absent; authorized lineage remains. |
| 4. Revoked reviewer | Finding then review locks; invalid open assignment is closed with an audit record before replacement selection. Scope, reviewer-role and demo-boundary revocation pass; no replacement remains pending; self-review/revoked decisions denied. |
| 5. Optional peer tiers | Correction, review, membership and API core reads do not request peer tiers. Actor ownership still runs first. Rendered correction form tests cover hanging/failing optional peers, enabled correction inputs, and denied actor ownership. Workbench/record still enrich displayed peer tiers. |
| 6. QA harness | Correction review opens the context belonging to the new assignment's actual reviewer. Original 20-second action/30-second navigation assertions remain. Failures save safe stage, final URL without query, request IDs, status/completion and classification; research-only failure screenshot stays ignored. No cookie/OTP/signature/key logging. |
| 7. RPC diagnosis | Safe server stages distinguish network, transport, provider unavailable, timeout and block consistency. Correlated research API response IDs; tests prove concurrent IDs and sanitized logs. Existing 10-second RPC timeout, retry count and fail-closed gate unchanged. |
| 8. Usability | Immediate accepted-brief anchor, collapsible compact mobile navigation, correct author correction prompt/link. Chrome checks navigation access, compact height, anchor and overflow; unit test checks correction next action. |

Tests: `tests/database/research.test.ts`, `tests/unit/research-editor.test.ts`,
`tests/unit/ownership.test.ts`, `tests/unit/diagnostics.test.ts`,
`tests/e2e/shell.spec.ts`, `tests/live-research/journey.spec.ts`.
No genuine member research records were used as mutation targets.

### Automated and hosted checks

- `pnpm check`: **PASS**, 110 unit, 122 database, 11 contract tests; lint,
  typecheck, generated database type drift and production build pass.
- Chrome `pnpm test:e2e`: **38 passed**, desktop/mobile, final run 13.7s.
- Focused unit command in the handoff: **24 passed**. Focused research database
  file: **26 passed**. These are subsets, not additional suite totals.
- Initial lint found pre-existing ignored `.local/qa05-research` exploratory
  test files. ESLint now ignores local deployment/QA artifacts, not tracked tests.
- Migration 011 applied transactionally to hosted Supabase. No data cleanup or
  role grant was run. Hosted security SQL **PASS**: 24 forced-RLS tables, denied
  browser table reads, protected RPCs including new helpers denied to both roles.
- Executable `e8b7426dcbcab7e5adc68e98737d4e1f146ab223` committed and pushed.
  GitHub CI **PASS**: https://github.com/baslaeth/grindly/actions/runs/36139450883.
  Existing action-runtime/runner-image notices remain, not failing checks.
- Deployed only after deterministic checks passed, using a tracked Git archive:
  **READY** `dpl_BQVfPZSGTsCvgsNXy9XzLHjMvthe`,
  https://grindly-210tfh0lg-basla1.vercel.app,
  stable https://grindly-woad.vercel.app.

### Authenticated local journeys

- First attempt: desktop **FAILED** at the initial review decision selector
  (20-second timeout); mobile **PASSED**, finding
  `1b0a00fd-be4d-43e9-af8a-9eea0143ed07`. No established root cause; no timeout
  increase or assertion removal. The persisted desktop draft remains labeled QA.
- Clean rerun: **2 passed in 4.6 minutes**. Desktop
  `d54d006e-9ebd-4486-84e3-fea597ef637c`; mobile
  `bfe32a7a-ff2f-4709-a0b1-bba9eabfd92e`.
- Both use separate authenticated labeled identities with existing real chain-
  46630 NFTs: discussion/reply -> attributed v1 -> correction request -> v2 ->
  actual assigned reviewer -> acceptance -> three concurrent retries/one award ->
  compatible usefulness -> accepted brief -> ledger progression.
- Built-in browser also inspected the current original member's protected
  Workbench and immediate brief jump read-only, with visible QA-usefulness labels.
- Production desktop/mobile results follow below. Generated fixture OTPs and
  synthetic reviews are not proof of real inbox delivery, human assessment or
  customer validation. Phase 1 A remains passed; B invalidation/return, C full
  production auth lifecycle and D issuance recovery remain deferred.

### Corrected production executable: live results

- Full desktop/mobile command on `e8b7426`: desktop **FAILED** at correction
  navigation; mobile **PASSED** the full mutation/recognition journey (2.0m),
  finding `77cbdc8e-3c02-44df-b519-04a806ca87b0`.
- The failed desktop captured the safe unavailable page, final `/findings/new`
  URL, response HTTP 200 (server-rendered denial), timeout, request completion
  state and Vercel request ID `xb74r-1790342157373-db7b00096375`.
  Vercel logs correlate `ownership.owner / rpc_transport`, followed by
  `research.render.new / service_unavailable`. This was the acting member's
  mandatory ownership read, not optional peer tier enrichment. No evidence was
  exposed and no correction was submitted after that failed check.
- This establishes a new RPC availability failure, not the root cause of the
  historical POST 503. No timeout increase, access fallback or automatic test
  retry was added. A separate fresh desktop verification was requested after
  retaining the failure artifacts under ignored `.local/qa05-remediation/`.
- Production mobile screenshot was inspected: compact navigation, readable
  status/credit/progression, visible synthetic account/history labels and no
  horizontal overflow. Test activity is not genuine-member/customer evidence.
- Fresh desktop-only command: **FAILED** at the final Membership XP assertion
  (1.9m), after correction, acceptance, concurrent award idempotency, usefulness
  and brief assertions had succeeded. It is not a passing full journey.
  The safe unavailable page and Vercel request
  `ksdl2-1790342447425-daceb2bc8ebd` again correlate
  `ownership.owner / rpc_transport` and
  `research.render.membership / service_unavailable`. Response HTTP 200 completed
  with a denial UI; no ownership fallback. Provider-level root cause is unknown.
- **Remaining blocker:** intermittent live ownership-read availability prevents
  a clean complete production desktop run on this executable. Local desktop/
  mobile and production mobile passes stand; failed attempts also stand.
  Do not increase timeouts, claim full hosted reliability, or declare readiness
  for supervised genuine-user testing from these results. Labeled UI annotation
  and independent security re-review can proceed. Genuine reviewer staffing,
  wider hosted contention, human promotion/peer-request use, and Phase 1 B/C/D
  remain outstanding. No genuine research mutation or role grant was performed.
- Final `git diff --check`: PASS. Evidence/manifest-only checkpoint follows the
  deployed executable; all source fixes and CI are already pushed.

## 2026-09-25: focused production ownership reliability diagnostic

Scope: diagnostics, bounded read-only reproduction and the confirmed mobile
grid-row correction only. Owner reports Chat 05 passed all previous High/Medium
remediation findings; no new critical/high/medium application defect confirmed.
Historical failures above remain recorded. No research writes, promotions,
role changes, minting, transfers, authorization fallback or timeout increase.

### Executable and safe diagnostics

- Tracked executable `a89e4d527459034874a124723ffed44b5dc73a79`, deployed from
  `git archive` after deterministic checks, not from the dirty working directory.
  READY `dpl_ENeKY144qwEBSAKxbJ73RUYwRUvx`, immutable URL
  https://grindly-4oxxfrmmz-basla1.vercel.app, stable
  https://grindly-woad.vercel.app. Manifest updated in the evidence commit.
- Failure events now extract signed-32-bit integer codes only from actual
  `RpcRequestError` causes, validated HTTP status (100-599), allowlisted error
  names and transport codes. Cause traversal is bounded/cycle-safe. No raw
  exception, message, payload, URL, credentials, signature or cookie is logged.
- Per-read observers count actual HTTP attempts, resetting per RPC stage, and
  record stage elapsed time plus request correlation. HTTP callbacks retain
  upstream status even when viem maps HTTP 500 + JSON-RPC error to an RPC error.
  A mocked-fetch regression uses the installed viem transport to prove two
  attempts, code -32005, HTTP 500 and exclusion of secret-marked text. This is
  simulated diagnostic coverage, **not** the observed production failure cause.
- Metadata now returns X-Request-ID, matching the failure context. Server
  Component ownership failures use a per-read correlation UUID when no API
  request context exists; Vercel's enclosing request ID remains available.
- A once-per-worker configuration event emits only whether the endpoint exactly
  matches the documented public testnet URL (optional trailing slash). Local
  returned true; Vercel returned true for requests
  `8xwpb-1790345766287-aa987993c730` and `ts8x5-1790345776783-6972ff55f904`.
  Sensitive Vercel environment pull values were masked and were **not** treated
  as evidence of mismatched configuration.
- Same live chain, owner, epoch and block-hash checks; two confirmations for
  binding; 10-second RPC timeout and one configured retry unchanged.

### Results

Read-only token-2 probes, 2026-09-25 approximately 14:06-14:19 UTC. Each mode ran
10 sequential reads, then six reads in pairs (maximum concurrency two), with
quiet intervals; modes did not overlap. Raw RPC uses the same public endpoint
and block-pinned owner/epoch/hash sequence, without viem or retries. Metadata
requests execute the application's live ownership path plus metadata DB reads.

| Path | Sequential | Concurrency two | End-to-end elapsed range |
| --- | --- | --- | --- |
| Local raw JSON-RPC | 10/10 | 6/6 | 1245-1367 ms |
| Local actual viem `readOwnership` | 10/10 | 6/6 | 1242-1331 ms |
| Local metadata HTTP | 10/10 | 6/6 | 2229-3754 ms |
| Vercel production metadata HTTP | 10/10 | 6/6 | 1300-3620 ms |

- **64/64 passed, zero observed ownership errors** in these samples. Requests
  were no-store, with unique production application request IDs. Example final
  concurrent request: `6eff0627-7e19-459f-a50f-2b154b9aef71`, Vercel
  `fra1::iad1::47f2z-1790345799312-1985ba5618ce`.
- Read-only authenticated QA browser probes: local mobile **1 passed** (four
  pages); production desktop/mobile **2 passed** (eight pages). Workbench,
  Submit Finding, Review and Membership all rendered actual authenticated
  content, with completed HTTP 200 responses. Production page times were
  3206-11746 ms; these include auth, database, peer enrichment and rendering,
  not only RPC time. No full mutation journey was rerun or claimed.
- Production Membership request IDs: desktop
  `fra1::iad1::8bdfc-1790345848558-f8d23270e6c4`; mobile
  `fra1::iad1::cfgnb-1790345876806-541a48a66170`.
- Vercel `grindly.request_failure` query for this deployment/probe window
  returned no events. This establishes no reproduced final error, not proof
  that no transient retry occurred or that future availability is guaranteed.
- Local and production populated mobile sidebar height **67px** on all four
  pages; no horizontal overflow. Foundation Chrome tests cover short denied
  screens across all six routes. Short Workbench and populated Workbench/
  Membership screenshots inspected. CSS change is only mobile
  `.app-shell { grid-template-rows: max-content 1fr; }`.
- `pnpm check`: **PASS**, 120 unit, 122 embedded database, 11 contract tests,
  lint, types, generated database type drift and build. Chrome `pnpm test:e2e`:
  **38 passed**. Added probe harness also passed lint/typecheck. `git diff
  --check`: **PASS**. TLS verification retained throughout.
- Safe per-request reports remain under ignored `.local/reliability-probes/`;
  screenshots under ignored `test-results/`. QA fixture OTP generation is not
  real inbox delivery. No genuine research data was changed.

### Diagnosis and limits

**E: still insufficient evidence.** The historical production ownership failure
did not reproduce. A provider availability issue, B Vercel/network behavior,
C application/client defect and D concurrency sensitivity are not established
or excluded by this bounded sample. In particular, no failure increase appeared
at concurrency two; this is not a load test. No application-side ownership
reliability fix is justified; instrumentation and the requested CSS fix only.

Previous transfer-back A and security passes stand. Phase 1 B invalidation/
return, C full genuine-inbox lifecycle and D hosted issuance recovery remain
deferred. Real reviewer/steward staffing and human assessment are still needed.
Annotation and supervised isolated demo use can proceed; genuine-user
reliability sign-off remains withheld while intermittent failures remain
unexplained. No production-ready or customer-validation claim.

Reproduction commands (existing isolated fixtures and services required):

```powershell
$env:NODE_USE_SYSTEM_CA='1'
$env:GRINDLY_PROBE='1'
# Run each mode separately: raw, direct, local, production
node --conditions=react-server --import tsx --env-file=.env.local scripts/probe-ownership.ts raw
pnpm exec playwright test --config playwright.research.config.ts ownership-probe --project mobile
$env:RESEARCH_TEST_URL='https://grindly-woad.vercel.app'
pnpm exec playwright test --config playwright.research.config.ts ownership-probe
```

## Local six-screen UI redesign (2026-09-25)

Owner-authorized presentation work on `codex/ui-specialist-workspace`, based on
saved reliability checkpoint `44dc11f`; implementation commit `90beed6` plus
the final local evidence commit. **No deployment.** Production remains on
`a89e4d527459034874a124723ffed44b5dc73a79`. The diagnostic checkpoint and its
unresolved availability finding above remain intact.

### Scope and evidence boundaries

- Charcoal/white shared styles and the original approved white SVG, unchanged.
  Join explains the specialist exchange before authentication. Workbench defaults
  to accepted evidence, with keyboard tabs and expandable older discussion.
  Existing forms, review, record and progression screens share the same system.
- Review now requires an explicit decision. Corrections keep immutable versions;
  pending/error inputs remain intact. Displayed specialty, NFT rank, independent
  authority, demo status, awarded credit and unfunded payment stay separate.
- No diff under `src/server`, `supabase` or `contracts` from `44dc11f`. No RPC or
  polling added for visuals, no authentication bypass or genuine research writes.
- Higgsfield was not callable in the available tools/skills. Integrated one
  18-second on-demand React/HTML/CSS explainer with original logo, real labels,
  static poster/transcript, pause/replay, one-shot playback and reduced-motion
  manual steps. No external upload, paid credits, media service or new dependency.
- Desktop/mobile before captures preceded edits; after captures use the same
  existing isolated QA personas through normal authentication and live testnet
  ownership. The capture harness refuses genuine research and masks non-demo
  bylines. See `ui-review/README.md`; asset/design details are in `ui-direction.md`.
- Simulated form failure intercepts only the isolated test browser's submission
  with HTTP 503; the assertion checks pending state and retained input. It is not
  an actual backend failure or a public bypass. No request is written to research.
- Initial journey rerun failed on desktop/mobile because the old harness relied
  on Accept being preselected. Both stopped at the accepted-state assertion; no
  decision had been submitted. The harness now explicitly chooses Accept for
  the actual assigned reviewer; all original timeouts and award checks remain.
  Labeled failed records/history are retained, not deleted or called passing.
  Safe failure reports are under ignored `.local/ui-review/`.

### UI verification results

- `pnpm check`: **PASS**, 120 unit, 122 embedded database and 11 contract tests;
  lint/typecheck, generated type drift and production build also passed.
- Chrome `pnpm test:e2e`: **46 passed**, all six denied/public screens and
  auth/research boundaries, one-shot motion, pause/replay, manual reduced motion,
  keyboard skip/focus, sampled contrast, and no overflow/caption overlap at
  320px and 1920px. This suite uses foundation mode, not live NFT fixtures.
- Authenticated local full journey: **2 passed**, desktop and mobile (4.9m).
  Discussion -> immutable v1 -> independent correction request -> corrected v2
  -> actual newly assigned reviewer explicitly accepts -> concurrent acceptance
  retries yield one 25-XP award -> attributed usefulness -> updated accepted
  evidence brief -> ledger-derived Membership. Findings:
  desktop `f4b3c215-2142-4be0-ab13-48edc5a1b027`,
  mobile `8af80a5e-c468-4d60-a133-fda5326ee9ea`.
- Before and after read-only UI captures: **2 passed each**, desktop/mobile.
  After checks include keyboard tabs, retained long discussion/deep links,
  actual protected pages, pending form controls and simulated-error retention.
  This is local Chromium/Chrome desktop and Pixel 7 emulation, not physical
  devices or a comprehensive assistive-technology audit.
- Screenshot inspection also caught a low-contrast mobile menu hover state.
  Dark hover background restored; hovered-menu contrast added to the regression.
- Final post-fix reruns: `pnpm check` and all **46** Chrome tests passed;
  read-only after capture repeated **2/2** successfully. `git diff --check`
  passed. **38** before/after responsive PNGs saved in `docs/ui-review/`,
  including the short denied page, populated pages and actual assigned review.
- No new production journey or real-wallet transaction was run for this local
  presentation checkpoint. No new production sign-off or customer-validation claim.

### UI reproduction

```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
# Existing isolated QA identities/services required; local dev app on port 3000:
pnpm exec playwright test --config playwright.research.config.ts journey.spec.ts
$env:GRINDLY_UI_REVIEW='1'
$env:GRINDLY_UI_PHASE='after'
pnpm exec playwright test --config playwright.research.config.ts ui-review
git diff --check
```

Do not interpret simulated tests, fixture OTP generation or synthetic awarded
work as genuine inbox delivery, human specialist assessment, customer validation,
or completion of deferred live Phase 1 B/C/D. Transfer-back A remains passed.
Historical intermittent RPC availability and genuine reviewer/steward staffing
remain separate blockers; UI work is not production-readiness evidence.

## 2026-09-28: bounded Bronze/Silver rank spaces (local executable)

### Authority and preserved checkpoint

- Owner brief saved in `mvp-rank-spaces.md`. Base UI commit `1862bb3` retained
  on `codex/checkpoint-ui-1862bb3`; implementation on `codex/mvp-rank-spaces`,
  first commit `f11482f`. Charcoal/white UI, approved logo, six routes and earlier
  authorization/reliability fixes preserved. Unrelated untracked brand exports
  were not staged or changed. No new animation, contract, wallet or economics.
- The owner explicitly superseded reset-to-Bronze-on-sale. Durable NFT tier and
  personally earned credit are now separate. Historical transfer-back A remains
  passed. Earlier B baseline is historical; its old reset/no-revival expectation
  is superseded, not retroactively verified. No manual transfer was requested.

### Schema and security

- Migrations 012-015 applied in one transaction through the authenticated
  Supabase SQL editor. CLI access was unavailable; existing runbook migration
  history repair remains necessary before `supabase db push`.
- Transaction asserted unchanged complete-row digests for existing members,
  wallet bindings, membership bindings, audit events, messages, findings,
  versions, award ledger, review assignments/decisions, member roles and
  promotion decisions. **PASS**. New columns/rooms/display rows and acquisition
  history were additive; no existing research, roles or audit history deleted.
- Result: **20 rooms**, ten per rank; **9 fictional display profiles** (5 Bronze,
  4 Silver), not new auth/member rows. No active old promotions existed before
  migration, so no retired QA Silver approval was revived.
- `scripts/verify-hosted-security.sql`: **PASS**, all **29** tables forced RLS;
  anonymous/authenticated roles denied table access and protected invitation,
  research v1/v2, rank and tier RPCs. Same restrictions pass on empty embedded DB.
- Shared database changed, **production executable did not**. Migration 015
  prevents the old executable's all-record snapshot from leaking Silver data:
  legacy Bronze calls use v2 filtering; legacy Silver research calls deny.
  Production metadata is still the old executable until an authorized deployment.
  This is not a claim that the new rank/tier experience is live on Vercel.

### Automated results

- `pnpm check`: **PASS**, **129 unit**, **143 database**, **11 contract** tests;
  lint, typecheck, generated database-type drift and Next production build pass.
  Old owner/epoch-reset metadata expectations were replaced with the newly
  authorized durable-tier expectations, not retained as contradictory assertions.
- Focused tests: `tests/database/rank-spaces.test.ts` and updated research/security
  suites cover both directions of exact-rank reads/actions, ten-room persistence,
  replies and original author identity, private lineage content/ID redaction,
  reviewer rank changes/reassignment, correction propagation and one initial award.
- Simulated Silver transfer/return retains tier, denies stale binding, leaves
  buyer XP at zero and original contributor XP/history unchanged. Unknown
  acquisition provenance remains unknown; no paid-purchase inference. Fixture
  delegate/owner identities stay separate and create no real ledger/member rows.
- Unit context regressions reject hidden room/profile/finding/version/message
  URLs and rank races; acting ownership still gates reads. Strict input rejects
  invented author/delegate/owner/NFT-XP/rank payload fields. Irrelevant peer RPC
  failure/hang cannot block the correction editor.
- Chrome `pnpm test:e2e`: **46 passed**. This is foundation-mode boundary/UI
  coverage, not live authentication or real NFT ownership evidence.
- An early database assertion depended on UUID ordering when messages had equal
  transaction timestamps. Corrected it to assert author identities independent
  of order and reply attribution explicitly; subsequent complete runs passed.

### Authenticated local browser results

- Existing three isolated, labeled QA members only; no genuine research writes.
  Normal app verification with operator-generated QA OTP, plus real testnet
  ownership reads, not genuine inbox delivery or a browser authentication bypass.
- Full contribution journey: **2 passed**, desktop and Pixel 7 mobile emulation.
  Discussion -> original finding -> independently requested correction -> v2 ->
  actual newly assigned reviewer accepts -> concurrent retries give one 25-XP
  award -> attributed usefulness -> brief and personal progress update. Records:
  desktop `f739b11d-f58b-4596-9474-0b6b7377f009`;
  mobile `6bc2dc04-a999-451f-8f00-73f7e957fa73`.
- New local rank/profile journey: **2 passed**, desktop/mobile. Current-rank
  directory has no email fields; ten Bronze rooms, labeled fictional examples,
  Alex's profile separate from David's NFT/profile, personal/delegated quantities
  distinct, Escape dismissal, empty room editor link and no overflow.
- Direct Silver room API read/write, Silver demo-profile API and corresponding
  Workbench/editor/profile URLs denied from Bronze. A denied write creates no
  Silver message. No timeouts, chain requirements or fail-closed gates weakened.
- Initial mobile profile check, and later desktop empty-room-editor capture,
  failed while client navigation was finishing. The latter failure snapshot
  already showed the form after the assertion deadline. New harness explicitly
  waits for the destination URL using the existing journey's 30-second
  navigation bound, then asserts the drawer/editor. Existing ownership and
  element-assertion timeouts were not increased. Screenshot caret hiding was
  disabled to avoid modifying form styles during development-mode hydration.
- **16** masked desktop/mobile PNGs in `docs/rank-spaces-review/`: populated
  Bronze General, delegation conversation, Alex/David drawers, empty room,
  unavailable room/editor/profile. Captures refuse genuine research and mask
  genuine directory identities. Manually inspected populated, profile and short
  unavailable layouts; shortened the progress disclaimer and fixed singular count.

### Explicitly incomplete / not claimed

- Positive Silver browser journey is **unverified**: existing QA NFTs are Bronze.
  Silver room persistence/access/transfer continuity pass isolated SQL/unit tests,
  not a live Silver wallet exercise. No permanent synthetic promotion was added
  merely to obtain screenshots. No live NFT sale/transfer in this task.
- Prior genuine production auth lifecycle C, hosted issuance recovery D, genuine
  reviewer/steward staffing and intermittent RPC availability remain unresolved
  or deferred as recorded earlier. No production-readiness claim.
- Delegation execution, reward splits, verified purchases, upgrade economics,
  demotion/burn rules, native tokens/payouts, marketplace and higher-rank rooms
  remain inactive/out of scope. Fictional XP is not traction or real expertise.
- No Vercel deployment and no feature-branch push. Production executable remains
  `a89e4d5`. Local review: http://localhost:3000/workbench. Chat 05 targets and
  exact commands: `QA05_RANK_SPACES_HANDOFF.md`.
- Final post-copy/harness checks: full `pnpm check` passed with the totals above;
  Chrome **46/46**, refreshed rank/profile captures **2/2**, lint/typecheck and
  `git diff --check` passed. All sixteen screenshots are from the final UI.

## 2026-09-28: actual rank-chat click-path repair

Owner-authorized repair from `5c88ec4` on `codex/mvp-rank-spaces`, not a new
product phase. No reset, migration, contract change, production deployment or
genuine research mutation. Local review: http://localhost:3000/workbench.

### Build and interface

- Port 3000 listener was traced to this checkout's Next dev process (PID 46504,
  parent command `next dev --hostname 127.0.0.1 --port 3000`). The actual DOM
  before repair confirmed the evidence-first default; it was not an older app.
- Chat now opens on category selection. The room title, composer, history and
  honest empty state are together; research tools remain secondary. Members is
  an explicit action, with recorded real/QA counts separated from demo examples.
- Profiles retain permitted contribution/review history and separate personal XP
  from illustrative NFT-delegated progress. Original author and owner links stay
  distinct. No new per-profile RPC reads or authorization fallbacks.
- The current-room mobile selector initially changed the URL but left Members
  selected. This **real defect was reproduced**, then fixed using native hash
  navigation for in-place selection and a reusable current-room prompt. Final
  mobile routing run passed all ten room selections without a Chat-tab click.
- Earlier browser failures also identified an incorrectly nested test locator
  for David's own post and the selector's implicit accessible name. Corrected
  locator and explicit Room name; neither assertion deadlines nor permission
  assertions were relaxed.

### Deterministic and boundary evidence

- `pnpm check`: **PASS**, **130 unit**, **144 database**, **11 contract** tests;
  lint, typecheck, generated type drift and Next build pass.
- Chrome foundation `pnpm test:e2e`: **46 passed**. Foundation mode is not live
  OTP/NFT evidence. `git diff --check`: **PASS**.
- New unit regression checks public exact-version reviews/corrections while
  excluding private findings, hidden versions and inaccessible decision IDs.
- New SQL regression includes every permitted active rank member in the
  directory, including non-posters and a member with no research profile;
  opposite-rank members and emails are excluded. Existing rank, lineage,
  demo/genuine, duplicate-award and NFT-continuity regressions still pass.
- Existing authenticated rank boundary suite: **2 passed**, desktop/mobile.
  Direct Silver room read/write and profile/Workbench/editor URLs denied from
  Bronze. These negative direct-URL checks are separate from navigation proof.
  Captures from this repeat use `.local/rank-boundary-screens/` so prior dated
  screenshots are preserved, not silently replaced after room content changes.

### Hosted compatibility, not a deployment

- `hosted-rank-compat.spec.ts` uses an existing labeled QA identity with normal
  app verification, operator-generated QA OTP and real ownership reads. No
  genuine browser session is copied. No hosted research writes or schema changes.
- Older deployed executable returned ten Bronze rooms, Bronze-only directory
  and examples, no emails, and message/finding room IDs confined to that rank.
- First run: Workbench, Submit Finding and Review rendered with authenticated QA
  content. Membership returned HTTP 200 with the safe research/ownership
  unavailable page, **not a successful protected read**. This run failed.
- Explicit repeat: **1 passed**; Workbench, Submit Finding, Review, Membership
  and metadata succeeded, no page errors or personal metadata. Intermittent
  hosted availability remains unresolved; a passing repeat does not erase it or
  identify its cause. No speculative provider/network diagnosis made here.
- Production remains the older executable `a89e4d5`. Shared migrations 012-015
  were already applied before this repair; no unrelated hosted changes made.

### Evidence boundaries

- Only existing isolated QA identities and visibly fictional examples are used.
  Positive live Silver and NFT-transfer/tier-continuity checks remain unverified;
  no manual transfer, temporary promotion or new wallet setup in this repair.
- Earlier completed live transfer-back remains passed, not rerun. Genuine inbox
  lifecycle, hosted issuance recovery and genuine reviewer/steward staffing remain
  deferred/unresolved as previously recorded. No production-readiness claim.
- Current reports/targets: `QA05_RANK_CHAT_REPAIR.md` and
  `QA05_RANK_SPACES_HANDOFF.md`. Feature-branch push is owner-authorized;
  production deployment, merge and force-push are not.

### Local click-path evidence

- Desktop and mobile routing tests **passed** all ten categories via the actual
  sidebar links/mobile selector, deliberately starting on Members each time.
  Correct category, Chat selection, composer, exact room message IDs and empty
  states were asserted. No direct room URL navigation substitutes for these clicks.
- Desktop and mobile persistence tests **passed**: one clearly labeled QA message
  per room posted through the UI, retained on refresh and absent from the next
  room. Traders reply also persisted; actual QA author click opened their profile
  with recorded personal/empty delegated credit, then returned to Traders chat.
  Posting/replies left the personal XP/points aggregate unchanged.
- Directory tests include every returned member/example link, not only posters;
  all three QA and all five permitted Bronze fictional profiles were clicked.
  Genuine entries are checked for presence but neither opened nor captured.
  Alex -> David's NFT, David's own post -> David, and Back to chat are separate
  browser clicks. Both viewport directory tests passed before the capture repeat.
- A later repeat failed on the local mobile QA-risk profile: HTTP 200 rendered
  the safe research/ownership unavailable state instead of a drawer. Safe server
  classification was `service_unavailable`, with null RPC code/HTTP subtype and
  no correlation ID on that render. Cause is not established. Do not erase this
  failure or count it as an authorized successful read. Timeouts and fail-closed
  behavior were unchanged.
- Final focused reruns passed both viewport profile paths, including every QA
  and fictional profile, author/owner/own-post links and returning to the same
  chat. **Six unique click-path scenarios passed across the final focused runs**
  (routing, persistence, directory/profile on desktop and mobile). Not a claim
  that every earlier run passed: the failures above remain part of the evidence.
- One additional screenshot-only assertion hit fractional device-pixel rounding
  (99.9675% intersection rather than exactly 100%). Screenshot visibility now
  tolerates less than 0.1% rounding; exact credit values, navigation and existing
  timeouts remain asserted. Final mobile capture passed with all credit rows.
- Existing full research journey: **2 passed**, desktop/mobile. Discussion ->
  finding v1 -> independent correction request -> linked v2 -> actual reassigned
  reviewer accepts -> one idempotent award -> usefulness -> updated brief and
  credit. New labeled QA findings: desktop
  `240be454-04e4-4549-8555-ae869f9d033a`, mobile
  `0ff669fe-6a3d-4ddb-9c83-0761bc5211e0`. Not genuine customer outcomes.
- **14** sanitized PNGs in `docs/rank-chat-repair/{desktop,mobile}/`: empty and
  populated Traders, directory, grinder/owner profiles and their credit sections.
  Empty-room captures predate the test posts. Capture guards reject genuine
  research and mask genuine directory identities. Selected captures were visually
  inspected for readable layout and privacy; existing dated screenshots retained.
- Final code `pnpm check` passed again with **130/144/11** tests plus build;
  Chrome foundation passed **46/46** on the repaired executable. Outgoing four
  prior commits and staged repair text were scanned for configured secret values,
  private-key markers and token-like strings: no hits. No added personal-email
  lines. Untracked brand exports, `.env.local`, QA journal and failure artifacts
  are excluded. Only the unchanged approved tracked logo is carried forward.
- Commit `443ab2358add952b45589e15cc4d2a6ade3d2cdb` pushed successfully to
  `baslaeth/grindly`, branch `codex/mvp-rank-spaces`; `git ls-remote --heads`
  independently returned that exact hash. This documentation-only follow-up
  records the push. No force-push, merge or production deployment performed.
  Tracked working tree was clean after commit; unrelated brand exports remained
  untracked and unchanged. Port 3000 still serves the verified local checkout.

## 2026-09-28: Login browser annotations (local only)

- Implemented the 21 marked copy/navigation/icon/layout changes. Existing paths,
  auth and research behavior are preserved. A generic profile icon links to
  `/membership`; no personal photograph was supplied. Official unchanged Robinhood
  Chain SVG provenance is recorded in `ui-direction.md`.
- Removed duplicate example copy while retaining the fictional-scenario label and
  testnet no-monetary-value footer. Disabled the Next development indicator using
  its documented configuration, without disabling runtime errors.
- Final `pnpm check`: lint, typecheck, **130 unit / 144 database / 11 contract**,
  generated-type drift and build all passed. Initial typecheck found the new test
  tuple needed `as const`; corrected before the successful complete check.
- Chrome `pnpm test:e2e`: **48 passed**. Initial run had 46 passes and 2 failures
  because the contrast check still selected the intentionally removed sidebar
  heading. It now checks the visible profile shortcut, retaining the contrast
  threshold and keyboard assertions; the full suite then passed.
- Actual development-server checks: `UI_REVIEW_URL=http://localhost:3000`,
  `GRINDLY_ANNOTATION_CAPTURES=1`, Chrome, then
  `pnpm exec playwright test tests/e2e/join-annotations.spec.ts`: **2 passed**.
  Desktop/mobile anonymous contexts verify labels, unchanged routes, absence of
  removed elements, loaded desktop logos, no horizontal overflow and the profile
  shortcut's fail-closed anonymous destination. No authenticated session copied.
- Captured and visually inspected `docs/join-annotation-review/desktop.png` and
  `mobile.png`; public-only content, no credentials or member data. The in-app
  local page was inspected read-only. No genuine records changed.
- No live research or wallet exercise repeated for this presentation-only change.
  Previously passed and explicitly deferred live checks remain as recorded above.
  No hosted changes, push or deployment in this follow-up.

## 2026-09-29: Connected member experience (feature branch, no deployment)

Authority: `connected-member-experience.md`. Branch
`codex/connected-member-experience` starts from saved annotation `ce19a1f`;
backend increment `5eac06e`. Local review is http://localhost:3000/.
The existing genuine browser session was inspected read-only at Home; all new
authenticated writes and captures use the existing isolated QA identities.

### Database safety and deterministic results

- Additive migrations 016-022 applied to shared Supabase. 016-018 applied in one
  transaction with 13 original-table preservation digests (new sequence/source
  columns excluded) and forced-RLS/browser-privilege assertions. Earlier aggregate
  checker/editor attempts rolled back; only the checked successful transaction
  is counted. 019-022 separately applied after deterministic checks. Existing
  genuine research, reviews, awards, identities and audits were not edited.
- New private service-only tables hold chat revisions, media, reactions, read
  state, request idempotency, actual activity, opportunities and registrations.
  Original message/source versions remain immutable. Legacy v1/v2 research APIs
  are preserved for the older executable; new UI uses guarded v3 snapshots.
- Final `pnpm check`: **149 unit / 173 database / 11 contract**, lint, typecheck,
  generated database type drift and Next build passed. Focused new coverage is in
  `tests/database/connected-member.test.ts`, `tests/unit/chat.test.ts` and
  `tests/unit/member-access.test.ts`; previous auth/access/research regressions
  remain in the complete suite.
- Coverage includes five exact ranks, unverified denial, demo/genuine isolation,
  direct private reads/actions/media, immutable source access after edit/delete,
  per-member send idempotency and concurrency, no message/reaction XP, real read
  state and pagination, independent decisions and exactly one award/activity,
  public card projection, operator/demo boundaries, exact eligibility, additional
  requirements and invalidation of old approvals when requirements change.
- Chrome foundation `pnpm test:e2e`: **48 passed**. Keyboard/focus, reduced motion,
  layout/contrast and annotation assertions retain their behavioral checks.

### Actual local browser evidence

- `pnpm exec playwright test --config playwright.research.config.ts tests/live-research/member-chat.spec.ts tests/live-research/journey.spec.ts tests/live-research/public-home.spec.ts`:
  **10 passed / 2 skipped** in the final integrated run. The additional new
  `member-chat.spec.ts --grep 'unread indicators'` run: **2 passed**. Total:
  **12 distinct passed desktop/mobile scenarios, 2 skipped operator scenarios**.
  Tests use two independently authenticated existing QA members with real Bronze
  testnet NFTs. They do not establish real inbox delivery, customer validation,
  or live Silver/higher-rank ownership.
- Browser navigation covers Home -> Hub -> all ten room choices -> actual
  persistent conversation -> Members/profile -> back to the same room; author
  links as well as directory links. Another rank's data is denied in deterministic
  API/database coverage, not represented as a live Silver browser transfer test.
- Same-rank delivery includes text/links, Shift+Enter, Enter, IME composition,
  replies, emoji/reactions, image plus actual two-frame GIF, attachment-only
  messages, reload persistence and incremental arrival without a full-page reload.
  File selection/paste/drop, preview/removal, draft recovery after reload, logout
  cleanup, failed-response retry without a duplicate, reconnect, older history,
  author edit/delete, persisted unread appearance/clearing were exercised.
- Empty display uses an explicitly simulated empty result only after a real
  authorized API read; historical fixture messages were not deleted to stage an
  empty room. Older-history and failed-send cases are controlled test conditions,
  not claims that a production outage was reproduced.
- Full alpha journeys start at the chat message action and retain its author,
  room and immutable source. They create pending work, obtain an independent
  correction request, submit a linked version, use the actually reassigned
  authorized reviewer, accept, and confirm one existing-policy **25 XP** award,
  matching profile/Activity and accepted brief. This is the existing documented
  demo award, not newly settled production economics. Isolated final findings:
  desktop `28d861a3-03e1-4d17-b943-f3b04ccd8a35`, mobile
  `e3e0116f-d088-47b7-9932-ec44e7b1002f`.
- Public sample cards are visible anonymously. Eligible Bronze sample interest
  persists; Silver-only participation stays locked. A separate database fixture
  explicitly simulates eligible Silver. No sample action opens a fabricated
  partner site, makes an application or produces a claim.
- Top-right My Profile remains usable; actual ledger totals/activity, recorded
  acquisition history, current/next NFT, To finalize thresholds/burns and disabled
  Claim $GRIND are asserted. No genuine delegated records exist to exercise;
  no illustrative owner/grinder credit is turned into earned expertise.
- Operator browser scenarios correctly skip: a read-only check confirms zero
  isolated QA stewards. The editor and its server boundaries are implemented and
  database-tested, but live management is **unverified**, not counted passed.
  No roles were granted to make a test pass.
- **12 sanitized PNGs** in `docs/member-experience-review/{desktop,mobile}/`:
  `chat.png`, `members.png`, `profile.png`, `my-profile.png`, `home-samples.png`,
  `public-home.png`. Visually inspected representative mobile/desktop captures;
  no horizontal overflow, all authenticated identities explicitly isolated.
  Playwright's official ffmpeg download timed out; **no interaction recording**.

### Earlier failures, fixes and boundaries

- Early pre-migration snapshot checks failed without modifying research. Initial
  test expectations still named v2 or matched the word allocation in a disclaimer;
  corrected to the actual v3 API and protected allocation-code field. These were
  test defects, not successful access evidence.
- Actual implementation defects found and fixed before final tests: attachment-only
  first sends incorrectly labeled Edited (020); duplicate Zod manage discriminator
  rejected valid opportunity participation (strict union plus regression); nonempty
  additional requirements needed mandatory independent verification (021); previous
  approval could outlive changed terms (022). Final deterministic/browser runs
  above include those corrections.
- Early browser runs had selector/navigation timing failures: mobile room selection
  picked hidden desktop navigation before completion, edit matched buttons instead
  of the textbox, and target expectations predated streamed page completion. Use
  viewport-specific navigation, role-specific selectors and the existing 20-second
  action budget; ownership timeouts and fail-closed checks were not increased.
- One fixture-auth network attempt returned ECONNRESET during overlapping earlier
  checks. Subsequent sequential runs passed. Cause is not established. Harness
  records safe stage/path/status/request-ID/classification, not cookies or raw
  Playwright auth errors. No authorization fallback was introduced.
- Old hosted executable compatibility command with `GRINDLY_HOSTED_COMPAT=1`,
  `RESEARCH_TEST_URL=https://grindly-woad.vercel.app` and
  `tests/live-research/hosted-rank-compat.spec.ts --project desktop`: **1 passed**.
  Four protected screens (/workbench, /findings/new, /review, /membership) and
  metadata returned 200, proper QA/rank filtering, no page errors, no research
  writes. This is compatibility evidence, not deployment of the new UI.
- Unfinished live Silver/higher-rank, manual promotion/transfer and historical RPC
  reliability checks remain explicitly deferred. Genuine delegation, claim flow,
  upgrade transactions, economics and campaign terms remain inactive/unconfigured.
  Media storage has bounded validation/rate/size limits but no automatic orphan
  purge; capacity/retention must be planned before growth. Phase 1 and production
  readiness are not declared complete.

### Saved and pushed checkpoint

- Final added-browser-test lint/typecheck passed; `git diff --check` and staged
  diff check passed. Outgoing changes since `origin/codex/mvp-rank-spaces` were
  scanned against configured secret values and private-key markers: no hits;
  no added personal-email lines. Only selected code/docs and 12 guarded screenshots
  staged. `.env.local`, `.local/`, test failure output and unrelated brand exports
  remain excluded.
- Three outgoing commits: preserved annotations `ce19a1f`, backend `5eac06e`,
  connected UI/evidence `7c7e4c08b567e62e9eece68d75597a8bd089e290`. Normal push to
  `baslaeth/grindly:codex/connected-member-experience` succeeded;
  `git ls-remote --heads origin codex/connected-member-experience` independently
  returned that exact executable hash. No merge, force-push or deployment.
- The running in-app browser at http://localhost:3000/ was reloaded and inspected
  after rendering: Home, Opportunities, Activity, Enter Hub and top-right profile
  link present. The first immediate DOM probe occurred before streamed content
  finished and was not counted as a rendering failure or success. The final
  inspection was read-only; no genuine research was changed.
- This documentation-only follow-up records the saved result. Unrelated untracked
  brand assets are preserved. Independent review target is feature-branch HEAD;
  see `QA05_CONNECTED_MEMBER_HANDOFF.md` and the explicit feature matrix.

## 2026-09-30: Category alpha, independent evaluation and honest AI boundary

Feature branch `codex/category-alpha-review` starts at saved/pushed `0d58c9d`.
Backend increment: `bf99fb5`. Local review: http://localhost:3000/.
No production website deployment, merge, force-push or manual transfer test.
Annotations, top-right Profile, approved branding and previous security fixes
remain. Full requested-feature classification: `QA05_CATEGORY_ALPHA_HANDOFF.md`.

### Authorization and shared database

- Owner approved additive migrations 023-025 and OpenAI processing for QA and
  genuine submissions, but deliberately deferred the API key. No real model call
  was made. Real AI cards, semantic paraphrase analysis and real-model injection
  resistance are **BLOCKED/unverified**, not passed using canned output.
- `scripts/prepare-alpha-migration.ts` generated one transaction that applied
  023-025, compared complete contents of every pre-existing public table, asserted
  forced RLS and denied browser RPC privileges. All assertions passed; all prior
  record digests matched. The SQL result is captured in
  `docs/alpha-review/migration-result.jpg`. Do not reapply or edit applied files.
- Existing isolated QA reviewers received Traders/Project Analysts scope only:
  six scope rows with audit events, checked against the ignored fixture journal
  and explicit demo identities. No genuine roles, research or awards changed.
- An early outcome harness attempted a direct empty fixture seed and failed the
  required-evidence constraint. Its two unversioned, isolated QA shells were
  retired after checking exact identity, creation window and absence of versions;
  audit entries remain. No submitted or genuine record was removed. The final
  harness submits through the authorized API and waits for real server time.

### Deterministic evidence

- `pnpm check`: **180 unit, 203 database, 11 contract tests passed**, plus lint,
  Next type generation/typecheck, generated database type drift and production
  build. Final test-only additions also passed lint. No build deployment.
- Added regressions cover nine category forms/types, predictions versus guides,
  source/observation time separation, provider approval and missing-key behavior,
  bounded source retrieval, unknown facts, strict model output/source references,
  prompt-injection/authority boundaries with mocked responses, category counts,
  revoked reviewer scope, live membership failure and correction-editor access.
- Database coverage includes immutable message evidence through edit/delete and
  linked corrections, same-rank pending visibility, hidden lineage/candidates,
  private image access, demo isolation, self-review prevention, category scopes,
  rejection/independent appeals, one-time awards, genuine credit blocked without
  an approved policy, due-only outcomes, direct RPC/RLS denial and upgrade
  preservation. Simulated Silver/higher ranks are not live NFT evidence.

### Actual browser journeys and public sources

- The connected desktop/mobile batch passed **13**, failed **1**, skipped **2**.
  The failed category-editor check was awaiting an assertion before streamed
  navigation completed. Explicit editor-ready waiting was added, preserving the
  original value assertion and all application timeouts. The focused category
  rerun passed **2/2**. Thus all 14 non-operator cases in that batch have passed;
  this is a rerun result, not a claim the initial batch was clean.
- Both full independent journeys passed: message action -> category alpha ->
  immutable pending version -> assigned reviewer correction -> linked version ->
  actual new assigned reviewer -> acceptance -> three concurrent retries ->
  exactly one existing demo-policy **25 XP / 25 points** ledger award -> matching
  Profile/Activity -> accepted brief. Final isolated findings:
  desktop `d8b0b558-34fa-413e-8229-97863a32e388`, mobile
  `2906d8a2-d23f-42ee-82fa-0a804b5fab09`. These are test work, not customer outcomes.
- Category browser tests cover actual Hub/Traders navigation, all nine options,
  image-only evidence, a saved response deliberately lost then retried once,
  one persisted version, retained input, peer private-media access, sourced
  feedback, pending sharing and no premature credit. Real ETH spot observations
  persisted with checked time/digest, while the AI card stayed null/blocked.
- Existing chat browser cases passed on desktop/mobile: text, image/GIF, replies,
  persistent reactions, drafts, retry, edit/delete, reconnect/history/unread,
  member/profile navigation, rank boundaries and sample opportunity eligibility.
  Simulated empty/history/failure conditions remain explicitly isolated.
- Due-outcome browser tests passed **2/2**: an explicitly synthetic 45-second
  horizon matures, a user-triggered read records **inconclusive**, the claim stays
  unchanged and XP does not change. The initial local-clock wait failed because
  the workstation was about 36 seconds ahead of Supabase (timestamp-only probe).
  The final test uses snapshot server time, as the application already did.
  Neither a real successful prediction nor an automatic scheduled worker is
  claimed. Earlier profile-link ambiguity was fixed with a scoped history link.
- `docs/alpha-review/source-probes.json` records real public Coinbase ETH ticker
  and Robinhood primary documentation retrieval, checked times and SHA-256.
  Traders and Project Analysts have this live source coverage; all nine have
  deterministic baseline checks. Other category-specific external facts and
  testnet contract/receipt category journeys remain incomplete/unverified.
- Read-only profile capture, final foundation rerun and older-hosted compatibility
  results are recorded in the final checkpoint subsection below.

### Limitations and failed attempts retained

- Earlier disconnected-server, accessible-label, database-fixture, lint and
  navigation-timing failures were corrected before the passing checks above.
  One later foundation run had 47 passes and one Home sample-label timing failure
  while other browser suites were active; it is not hidden or counted as passed.
- No real OpenAI output, actual paraphrase detection or live prompt-injection test.
  Missing key leaves saved work pending with source observations and a truthful
  retry path. Approval does not imply configured credentials or provider uptime.
- Genuine category XP rules and category reviewer appointments require owner
  decisions. No rule or authority was invented. Demo 25/25 awards remain examples.
- No isolated opportunity steward exists: its two live editor cases remain
  skipped, with deterministic authorization coverage only. No real partnership,
  campaign application or investment processing is demonstrated.
- Triggered pending/inconclusive outcomes work; scheduled workers and a human
  known/mixed outcome-entry screen are not implemented. Images remain human-review
  evidence; this integration does not send them to a vision model.
- No new delegate flow, claim, token, reward/burn threshold, upgrade, team vote,
  market or subscription. No genuine delegated history was available to verify.
- Screenshots are guarded isolated sessions in `docs/alpha-review/` and refreshed
  `docs/member-experience-review/`; failure output/secrets remain ignored. No
  walkthrough video: the earlier official ffmpeg download was unavailable.
- Historical successful transfer-back remains preserved. Deferred live promotion,
  Silver/higher/transfer, genuine inbox and ownership-reliability checks remain
  deferred. This checkpoint does not establish Phase 1 completion, production
  readiness or customer validation.

### Final category checkpoint checks

- Final `pnpm test:e2e --workers=2 --output .local/alpha-foundation-final`
  with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`: **48 passed**, no skips/failures.
- `alpha-profile-view.spec.ts`: **2 passed**, read-only desktop/mobile navigation
  from Home's top-right My Profile to category history, the correct attributed
  record and populated correction editor. Fresh viewport screenshots show the
  original source author and visible sample labels, without long-history capture
  artifacts. No horizontal overflow; disabled Claim $GRIND remains.
- Together with the category rerun, full correction/award journeys, chat/public
  sample cases and outcome checks: **18 distinct local cases passed across runs;
  2 operator skips**. Earlier failures remain documented above.
- Older production compatibility rerun with `GRINDLY_HOSTED_COMPAT=1`,
  `RESEARCH_TEST_URL=https://grindly-woad.vercel.app`,
  `hosted-rank-compat.spec.ts --project desktop`: **1 passed**. Workbench, new
  finding, Review Desk, Membership and metadata all returned 200 with expected
  QA/rank filtering and no browser errors. No research writes or deployment.
- Final `pnpm lint`, `pnpm typecheck`, focused Prettier check and `git diff --check`
  passed after the last test edits. The prior full `pnpm check` total remains
  180 unit / 203 database / 11 contract, with no application edits afterward.
- Reloaded the in-app browser at http://localhost:3000/: Home, Opportunities,
  Activity and top-right `/membership` present, no horizontal overflow. The
  founder's session was only read; no account switch or genuine record mutation.

### Saved category checkpoint

- Tested UI/evidence commit: `1bc1a24858ccd0e3ec1343e6cd1c7495ed91fa1a`; backend
  increment `bf99fb5`. Normal push to `baslaeth/grindly:codex/category-alpha-review`
  succeeded, and `git ls-remote --heads origin codex/category-alpha-review`
  independently returned that exact executable hash. No merge or deployment.
- Entire outgoing staged diff since `0d58c9d` was compared with configured secret
  values and private-key markers: zero matches; zero added personal-email lines.
  Staged whitespace check passed. Only selected code, tests, public-source probe
  facts and guarded QA screenshots were committed. Ignored environment/fixture
  files and unrelated untracked brand assets remain excluded and preserved.
- This documentation-only follow-up records the verified push and completed
  checklist. Independent QA target is feature-branch HEAD; use
  `QA05_CATEGORY_ALPHA_HANDOFF.md` for the explicit incomplete/blocked matrix.

## 2026-09-30: Member Journey and Evaluation Foundation

Started on verified `codex/category-alpha-review` at reviewed `40addac`; no reset
or branch replacement. Annotation `ce19a1f` remains an ancestor. Executable
checkpoint `56dc2d0b5e668e86f32f9412b664aaae86fd6ca3` was normally pushed to
`baslaeth/grindly` and independently matched with `git ls-remote`. No merge,
force-push, production deployment, model invocation, new role grant or genuine
research mutation. Local review remains http://localhost:3000/; the listening
Next development process was verified to belong to this repository.

### Implementation and honest availability

- Category/type/context first, short common core, explicit Unknown/Not applicable,
  server validation of omitted fields, chain/identifier limits and retained input.
  The focus selector uses nine categories without rewriting historical specialties
  or guessing the old default Project Analysts interest. Focus is not authority.
- Source-first Review Assistant separates completeness/provenance, retrieval and
  dates, missing evidence, prior-work hints, offline AI, independent decisions and
  later outcomes. Retrieved is never automatically Supported. Source observations
  are readable excerpts/tables with limits, not raw payloads or a quality score.
- Versioned category/type guidance and five qualitative reviewer assessments;
  permitted earlier-version hints with authorship/times; case-sensitive unsupported
  identifiers stay distinct. Future model outputs need supplied excerpts/dates and
  claim-specific explanations, but this is a mocked contract, not tested AI accuracy.
- Independent dated outcome entry and due queue are implemented. Immutable facts,
  sources, scope, uncertainty and comparison to original criteria are distinct from
  initial acceptance and XP. Old-version outcomes remain in filtered Profile
  history. No scheduled worker or automatic forecast success was implemented.
- **Migration 026 is NOT shared-applied.** The owner required explicit permission
  for further shared changes; the approval request remains pending. New save,
  focus update, refresh, qualitative decision and outcome-entry persistence is
  locally tested but live sign-off is BLOCKED. Affected buttons show an honest
  unavailable state; existing records remain inspectable. 023-025 were neither
  edited nor reapplied. Old function signatures are preserved for compatibility.
- `prepare-evaluation-migration.ts` generated an ignored, unexecuted 026-only
  transaction with whole-existing-table content digests and browser RPC/RLS denial
  assertions. Local upgrade regression includes populated legacy member/research
  records and proves unchanged contents, not merely empty-table preservation.

### Deterministic verification

- Final `pnpm check` at the executable checkpoint: **201 unit, 230 database,
  11 contract tests passed**, plus lint, typecheck, generated database type drift
  and optimized Next build. No contract changes. Build-time fail-closed session
  diagnostic is expected when prerendering without an authenticated request.
- Latest Chrome foundation `pnpm test:e2e --workers=2`: **48 passed**, 16.1 seconds.
  Desktop/mobile protected routes, API/origin denial, annotations, keyboard,
  reduced motion and responsive short/unavailable pages remain covered. These are
  foundation simulations, not live NFT or inbox evidence.
- Focused final alpha unit **35 passed**, alpha/upgrade database **31 passed**
  before the full final check. They cover nine persisted category contexts,
  missing fields, immutable submission/context, independent scoped decisions,
  exactly-once existing awards, prior-version privacy, source failure/retry,
  outcome idempotency, revoked authority and preservation across correction.
- Fourteen isolated evaluation descriptions cover all nine categories and six
  types, with useful, unsupported, contradictory, stale, incomplete, copied,
  hostile-instruction and later-disproved material. Two semantic cases are held
  out for future model testing. No sample model card or genuine outcome is seeded.

### Actual browser paths and limits

- Final read-only all-nine editor navigation: **2 passed**, desktop/mobile. Home
  -> Hub -> Submit alpha -> each category, required context, explicit Unknown and
  back to details, prediction-only horizon, retained main input and no overflow.
- Final Profile/alpha navigation: **2 passed**, desktop/mobile. Top-right My
  Profile -> observed/all history filter -> attributed alpha -> Review Assistant
  -> Outcome history -> populated correction editor. Original claim retained,
  correction type selected, Claim $GRIND disabled, no horizontal overflow.
- Public sample Home: **2 passed**. Fictional labels, benefits, per-card eligibility,
  no exposed private data or live application. Operator editor: **2 skipped**,
  because no existing isolated steward is designated. No role was granted to
  force a passing test. Source-copy formatting preserves later operator edits.
- The new nine-category save/rejection-appeal browser suite was attempted on
  desktop: **2 failed at the migration-availability prerequisite**. No submissions
  or reviews were performed by those tests. Their full live sign-off and the new
  independent outcome-entry browser path remain BLOCKED until 026 approval and
  application. Earlier genuinely passed alpha/award journeys remain historical
  passes, not substituted as proof for the new SQL/UI writes.
- Existing chat regression results and final CI status are recorded below when
  complete. All active sessions use the existing isolated QA identities, never
  the founder's session. Read-only inspection of founder Home sent no alpha or
  profile changes. No sessions, OTPs or wallet secrets were copied or captured.

### Public source evidence

`docs/evaluation-foundation/source-probes.json`, checked 2026-09-29 22:42 UTC
(2026-09-30 local): six real public read-only probes, **four retrieved / two
Unknown**. ETH spot and 24/24 completed hourly Coinbase buckets, Robinhood
connection documentation and Coinbase candle API documentation were retrieved.
The Ethereum docs root and legacy Robinhood host remained Unknown under bounded
no-redirect retrieval. No timeout increase or authorization fallback was used.

This deepens Traders and Project Analysts observations. Other categories have
context/provenance/document checks; compatible Robinhood testnet bytecode/receipt
checks are implemented but their new live category journeys remain unverified.
No mainnet security, issuer eligibility, traction, rights, allocations or successful
forecast is certified. Exact coverage and required later evidence are in
`evaluation-foundation.md`. Real model calls/semantic paraphrases remain
BLOCKED/unverified by the owner's deliberately deferred credential, not a request
for a key. Source refresh itself is model-free even if a key later appears.

### Earlier failures and safety audit

- One foundation attempt collided with another suite's output folder: 46 passed,
  2 artifact ENOENT failures. Research output now has its own ignored directory;
  subsequent foundation runs passed 48/48 without weakening assertions.
- The strengthened populated-upgrade fixture initially omitted an already-required
  source. Fixing the test data restored the preservation check; no SQL constraint
  was weakened. An editor test assertion was narrowed to core fieldset/button/
  textarea availability rather than forbidding every disabled option in markup.
- The new editor test exposed a real Unknown-to-details input retention bug;
  remounting that input on mode change fixed it. New history-filter exact labels
  and inclusion of older source observations were fixed before the final 2/2
  Profile rerun. Initial failed attempts are not counted as passes.
- Staged files were scanned against configured secret values/private-key markers:
  **zero matches**, zero unexpected personal email domains, zero ignored/private
  environment/session paths. `git diff --check` and staged whitespace checks passed.
  Unrelated untracked brand exports remain preserved and excluded.
- Captures: `docs/evaluation-foundation/{desktop,mobile}/` for correction editor,
  Review Assistant, outcome history, Profile and public Home; isolated chat/member
  captures are added by the regression run. Historical screenshot directories were
  preserved. No new video was captured; the existing ffmpeg availability gap remains.

Remaining owner decisions: authorize 026 before shared application; designate
genuine independent category reviewer scopes and approve genuine category XP rules
when ready. No formula, score, burn, claim, delegation split or reviewer was invented.
Automatic outcomes, real AI, live Silver/higher/transfer and historical Phase 1
gaps remain explicitly unverified/inactive. The completed transfer-back is not
reclassified. No production-readiness or customer-validation claim is made.

### Executable CI checkpoint

GitHub Actions [run 36643528962](https://github.com/baslaeth/grindly/actions/runs/36643528962)
completed **successfully** for exact executable
`56dc2d0b5e668e86f32f9412b664aaae86fd6ca3`. Its lint/types/unit/database/type-drift,
contract/build and browser workflow passed on the hosted Linux runner. This CI
does not contain a live model call, authenticated shared-026 write or wallet test.
The last local foundation rerun also passed **48/48** on this executable.
In-app Home was reopened at http://localhost:3000/ and inspected after loading:
Home/Hub/Submit alpha, top-right My Profile, genuine empty opportunities/activity
and separately linked samples were present. No founder action was submitted.

### Final local chat and review evidence

- `member-chat.spec.ts`: **8/8 passed**, desktop/mobile, 13 minutes sequentially
  to avoid concurrent fixture-login invalidation. Actual same-rank text, images,
  animated GIF, replies, persistent reactions, directory/author profile navigation,
  account/room drafts, lost-response retries, editing/deletion, paste/drop, unread
  state, older history and reconnect behavior passed. Empty/history/failure cases
  retain their explicit isolated simulations; live Silver access is not claimed.
- Together with the final editor/Profile/public sample checks: **14 distinct
  passing local browser cases; 2 operator skips**. The two new save/reject-appeal
  prerequisite failures remain **BLOCKED**, not counted as passes. No enhanced
  026 submission, independent outcome write or real AI end-to-end success is claimed.
- Latest sanitized desktop/mobile chat, directory, profile, sample Home and
  attachment evidence is saved under `docs/evaluation-foundation/`. Existing
  screenshots and genuine records were not deleted. The founder's Home remains
  open at the correct local URL with My Profile in its approved top-right position.
- Documentation/capture follow-up contains no executable changes. The executable
  CI success above remains applicable; final branch HEAD/remote verification and
  documentation-run CI status are reported in the delivery message.

## 2026-09-30: Grind Intelligence and activation preflight

Branch `codex/category-alpha-review`, base `1c33f2c`. Owner APPROVED migration
026. No approval for production deployment, merge, model calls or genuine roles.

### Shared database activation: BLOCKED

- Supabase CLI 2.117.0 `projects list` returns "Access token not provided".
  Requested local `pnpm exec supabase login`; no credentials were requested in chat.
- Correct TLS verification requires `NODE_USE_SYSTEM_CA=1` on this machine.
  A first table HEAD probe was inconclusive/misleading and is NOT activation proof.
  Subsequent service-client GET probes (`select`, limit zero, no record contents)
  return PGRST205 for member_category_focus, alpha_review_versions,
  alpha_source_checks, alpha_review_assessments and alpha_outcome_assessments.
  New alpha_category and alpha_submit_v2 RPCs return PGRST202; existing gated
  alpha_snapshot is present. Actual authenticated snapshot reports the new
  evaluation capability unavailable.
- No migration was executed/reapplied. 023-026 SQL is unchanged. No post-migration
  preservation or shared-catalog security success is claimed. The approved
  prepared atomic transaction remains ready with pre-existing table digests,
  forced-RLS and anon/authenticated function-denial assertions. Do not db push
  across unresolved historical migration tracking.
- Four targeted desktop shared-write cases were attempted: nine-category save,
  rejection/appeal, retry/source journey and outcome entry. All remain BLOCKED at
  schema availability/save; none is counted as a pass. No genuine research,
  appointments or award rules were altered. Existing isolated authentication
  sessions were used; no founder sessions were copied.

### Implemented and verified

- Grind Intelligence at `/intelligence`: Home link, sidebar directly after Submit
  alpha, mobile menu, current permitted alpha selector, category/author/time/
  version/status, four expandable questions and bidirectional alpha-page links.
  Reuses saved Review Assistant and outcome components, not a new source of truth.
  Hidden prior-work targets are omitted before deciding the visible empty state.
- Public introduction only; exact ownership/rank/audience/demo gating remains
  server-side. Direct inaccessible alpha identifiers reveal no selection or data.
  Source retrieval is not support, AI is disconnected, and unavailable refresh
  is honest. No LLM, token claim, new award rule or automatic outcome was added.
- `pnpm check`: lint/typecheck, **208 unit / 230 database / 11 contract**,
  database type drift and production build. Database tests include additive
  upgrade preservation, self-review, rank/private evidence, corrections, duplicate
  awards, rejection/appeal and immutable outcomes; these are isolated local tests.
- Chrome foundation suite: **52 passed**, desktop/mobile. Includes the new public
  page and no-data boundary, sidebar navigation, responsive shell and annotations.
- Authenticated read-only browser journeys: **6 distinct passes** (desktop/mobile
  nine-category editor, Profile/history/correction editor, Grind Intelligence).
  The last Intelligence rerun passed **2/2**: Home -> page -> select -> each question
  -> alpha Review Assistant -> return/reload -> mobile/sidebar link -> direct
  unavailable identifier. Existing testnet Bronze isolated accounts, synthetic
  research; no live Silver/transfer or new shared-026 writes are claimed.
- Earlier new-test failures were harness issues: reload raced App Router navigation,
  and a global alert selector also matched Next's route announcer. Assertions now
  await the actual URL and scope the alert to main; permission checks were not
  weakened. Initial transient compile/lint errors were fixed before final checks.
- Screenshots: `docs/grind-intelligence/{desktop,mobile}/{saved-checks,sidebar}.png`.
  Inspected both viewports. Refreshed existing isolated Profile/Assistant captures
  remain in `docs/evaluation-foundation/`. No private genuine records or secrets.

Founder: existing records can be inspected now via Home -> Grind Intelligence.
New alpha saving requires administrator login, approved migration activation and
rerunning the blocked write suite. Then Hub -> category -> Submit alpha -> required
context/evidence (Unknown permitted) -> receipt -> Grind Intelligence. Genuine
independent reviewer staffing and XP policy remain separately unconfigured.

Commit/remote/CI identity is recorded in the delivery; no production deployment.

## 2026-09-30: approved 026 activation, free evidence and local reasoning

Branch `codex/category-alpha-review`, continuing pushed `ec97802`; no merge or
deployment. Current implementation/coverage: `docs/evidence-sources.md`. This
entry supersedes the earlier pending-approval/authentication/schema blocker.

### Activation and preservation

- Preflight confirmed 026 source checks/submit_v2 absent. The authenticated
  Supabase dashboard ran the generated **026-only** transaction. All existing
  public-table digests were unchanged; forced RLS and browser-RPC denial passed.
  Catalog postflight confirmed both new objects, zero unprotected tables and
  zero browser RPC grants. Existing 023-025 were not edited/reapplied.
- An editor replacement left earlier SQL behind during initial postflight; the
  repeat attempt failed on an existing column and rolled back, without a second
  commit. After clearing the editor and rollback, the read-only postflight passed.
  Evidence: `docs/screenshots/evidence-sources/migration-026*.jpg`.
- Genuine research, roles and award rules were not changed. Shared writes use
  existing labeled isolated accounts only. No fabricated production reviewers,
  wallet approvals, live Silver proof or manual transfer exercise.

### Evidence and model verification

- Nine real public observations retrieved at the timestamps in
  `docs/evidence-sources/public-probes.json`: Coinbase ETH spot/hourly history,
  DEX pairs, DefiLlama current/historical prices and protocol TVL, GoPlus flags,
  Solana account/mint, and official Coinbase documentation. Two optional
  Alchemy/Helius observations correctly stayed unconfigured. Transaction and
  keyed-adapter matching have mocked tests, not live-account verification.
- Saved sources preserve version, asset/network, dates, units, reference and
  limitations. Cache/deadline/body/request limits, wrong-chain/quote-side
  rejection, invalid IDs, missing history, 429/outage and credential redaction
  are tested. Retrieved is not supported; current data cannot resolve history.
- **Real local inference ran**, Ollama v0.35.0 / qwen3:4b on RTX 3080 Ti. CPU
  inference timed out at the existing bound; an ASCII runtime path restored GPU
  discovery, not a larger timeout. Two isolated real primary-document cases
  produced supported/contradicted/unverified distinctions. Source/member content
  was untrusted; no model could approve or award. JSON reports retain source
  references/digests, not full primary documents or private context.
- One actual desktop browser request persisted a validated preliminary card,
  survived reload and left alpha pending with no XP. Later similar requests
  failed strict output validation. Failure was persisted with no successful
  card; UI retry remains available. Local reasoning is experimental, not
  measured accuracy or complete injection protection. The successful market
  card also missed available historical context and suggested an unnecessary
  follow-up; neither changes a horizon or schedules anything. No paid calls.

### Checks and browser evidence

- `pnpm check`: **223 unit, 230 database, 11 contract**; lint, typecheck,
  database type drift and production build passed. This includes additive
  upgrade preservation, exact-rank/private evidence, self-review, immutable
  versions/outcomes and duplicate-award boundaries.
- Chrome foundation suite: **52 passed** desktop/mobile with four workers and
  unchanged timeouts. An earlier 12-worker run had a loading-state timeout and
  an image-decode race; the logo assertion now polls the same decoded-image
  condition. No access or behavioral assertion was removed.
- Activated shared journeys passed on desktop and mobile: all nine category
  forms with Unknown, receipts, reload/pending sharing, source failure/refresh;
  independent rejection and appeal with a different reviewer; saved version
  retry, due/inconclusive outcome entry and Profile chronology; Grind Intelligence
  Home/sidebar/selection/questions/alpha and unavailable-identifier paths.
- The source walkthrough initially tried to fill a collapsed provenance section;
  it now opens that section through the UI. The legacy award-retry harness sent
  an obsolete request without the required assessment; it now replays the actual
  browser acceptance payload. Permissions and required assessment remain intact.
- Free-source browser checks report the actual model status separately. A pass
  for a truthful failed-analysis UI is **not** a successful model result.
  `docs/evidence-sources/{desktop,mobile}/local-analysis-status.json` records it.
  The first successful persisted card is preserved in
  `desktop/local-analysis-first-complete.png`.

Final source-state and correction/award batch: **4/4 passed**, desktop/mobile.
Both correction journeys used the actual reassigned reviewer's session, accepted
version 2, replayed three valid requests without another award, and matched the
existing demo XP ledger, brief and Profile. Across this activation pass there
were **14 distinct successful shared journey cases** (including the earlier
category-retry/outcome cases), not 14 genuine-member or live-Silver trials.
Final source UI results: desktop persisted invalid_output with no card; mobile
persisted a validated real card. An earlier desktop run also persisted a valid
card. In total, four in-app local model attempts yielded two valid cards and two
rejected outputs; this tiny synthetic set is not an accuracy estimate.

Captured and inspected desktop/mobile navigation and source/model screens under
`docs/evidence-sources/`; category/outcome/Profile captures are under
`docs/evaluation-foundation/` and `docs/alpha-review/`. They contain labeled QA
content, public sources and public testnet identifiers, not genuine private
research, emails, OTPs, cookies or keys. The model runtime, environment and raw
isolated diagnostic response remain ignored. `git diff --check` passed.

Genuine reviewer staffing, genuine category XP rules, optional
provider keys and broad model accuracy remain separate blockers/limitations.
Automatic outcome scheduling is unimplemented. The old hosted executable is
unchanged; these checks do not establish production readiness.
