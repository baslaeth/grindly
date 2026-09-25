# Chat 05: research remediation re-review

## Scope and status

Owner authorized this research journey on 2026-09-25, including one persistent
Workbench discussion. Frozen P0/stack remain authoritative. Read `AGENTS.md`,
`research-scope.md`, `PROJECT_STATE.md` and the latest `verification.md` entry.
Stop after QA/UI annotation; do not expand P0 or restart NFT-transfer tooling.

Phase 1 transfer-back A remains passed. B invalidation/return, C full production
auth lifecycle and D concurrent/interrupted/reverted issuance remain deferred.
The temporary Silver/steward fixture is retired with its history preserved.

## Review targets

- `supabase/migrations/202609250007_research.sql` through `202609250011_research_qa_boundaries.sql`:
  table/RPC grants, immutable records, permission filtering, row/advisory locks,
  exact-version scope/independence, unique awards, demo authority boundary,
  correction-to-assignment propagation and human promotion prerequisites.
- Focus on migration 011: pre-mutation demo/real guards, historical usefulness
  eligibility, recipient-specific lineage ID redaction, finding/review locks,
  invalidated assignment audits and independent replacement selection.
- `src/server/research/service.ts`, `src/app/api/research/route.ts`:
  session-derived actor, writable cookies, live NFT gate, exact origin, request
  limits, fresh Silver and candidate ownership checks. No browser service key.
- `src/proxy.ts`, `tests/unit/research-session-routes.test.ts`: all six screens,
  including new dynamic finding routes, match the existing cookie-refresh proxy.
- `src/research/model.ts`, `input.ts`: strict validation, accepted-current-only
  brief, canonical source lineage, ledger-derived totals, no universal score.
- `src/components/research-forms.tsx`, `research-views.tsx`, `research-screen.tsx`:
  author/source attribution, old versions, errors, labels, review/award/payment
  separation and mobile behavior across all six screens.
- `tests/unit/research.test.ts`, `tests/database/research.test.ts`,
  `tests/e2e/research-boundary.spec.ts`, `tests/live-research/journey.spec.ts`.
- `tests/unit/research-editor.test.ts`, `ownership.test.ts`, `diagnostics.test.ts`;
  `src/server/diagnostics.ts` and `src/server/membership/chain.ts`: no peer-tier
  dependency in correction/review editor reads, mandatory acting-member gate,
  sanitized diagnostics, unchanged RPC timeout/retry and fail-closed behavior.
- `src/components/navigation.tsx`, `research-views.tsx`, `src/app/globals.css`:
  only the three requested usability fixes. No new product workflow.
- `scripts/provision-research-fixtures.ts`, `seed-research-demo.ts`:
  explicit opt-in, isolated demo identities, no public bypass. Test-wallet keys
  and sessions must not enter Git or artifacts.

## Exact commands

```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
git diff --check
# Focused local coverage:
pnpm exec vitest run tests/unit/research.test.ts tests/unit/research-editor.test.ts tests/unit/ownership.test.ts tests/unit/diagnostics.test.ts
pnpm exec vitest run --config vitest.database.config.ts tests/database/research.test.ts
# Opt-in hosted QA, only with the ignored fixture journal and normal app running:
pnpm exec playwright test --config playwright.research.config.ts
# Same fixture journey against the tracked production deployment:
$env:RESEARCH_TEST_URL='https://grindly-woad.vercel.app'
pnpm exec playwright test --config playwright.research.config.ts
```

## Evidence boundaries and residual risks

- Foundation Playwright is unauthenticated/foundation mode, not live NFT evidence.
- Live research QA uses three independently authenticated, isolated personas
  with real testnet NFTs. Operator-generated QA OTPs, reviews and demo ledger
  entries are synthetic, not inbox-delivery proof or independent human judgments.
- Three concurrent accepted-review retries produced one award; embedded SQL
  tests cover stale revisions and rollback. Wider hosted correction/dispute/
  delivery race stress testing remains a QA target, not a claimed benchmark.
- Genuine reviewer/steward appointments are not provisioned without owner
  designation. Unassigned work must stay pending; demo roles must not fill it.
- Assignment remains unfunded. No payment or customer-validation claim.
- UI is ready for functional annotation; independent security review and the
  explicitly deferred live tests are not complete.
- Chat 05's independent `fa03134` local desktop/mobile and production desktop
  passes remain valid. The older ownership 503 was not reproduced; no cause is
  invented. See the newest verification entry for remediation-run outcomes.
- Re-review executable `e8b7426dcbcab7e5adc68e98737d4e1f146ab223` against reviewed
  baseline `3623a77`; the final evidence/manifest-only checkpoint is HEAD on
  `codex/phase-1`. Deployment identity is in `deployments/app-testnet.json`.
- Current results: 110 unit / 122 database / 11 contract / 38 foundation browser
  tests pass, as does GitHub CI. Local authenticated desktop/mobile and corrected
  production mobile pass. Two corrected production desktop attempts failed on
  acting-member ownership reads; no timeout/assertion was weakened. See safe
  request IDs and stages in `verification.md`, ignored captured failures under
  `.local/qa05-remediation/`, and server diagnostics in Vercel. No clean full
  production desktop pass is claimed. Availability remains a genuine-testing
  blocker; this is ready for independent re-review and labeled UI annotation.

Production fixture OTP setup initially failed before research; a later diagnostic
identified `INVALID_OTP`. The normal returning-email request runs asynchronously
while the operator separately generates a QA code, allowing competing token
issuance during setup. The harness now waits and retries only `INVALID_OTP`, at
most three isolated fixture codes, with no OTP/cookie logging. Other failures
still fail immediately. Production authentication was not changed. The complete
real-inbox/expired-session auth lifecycle remains unverified.
