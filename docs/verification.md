# Actual verification

Latest checkpoint: **2026-09-25, Chat 05 confirmed-finding remediation** (see the final
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
