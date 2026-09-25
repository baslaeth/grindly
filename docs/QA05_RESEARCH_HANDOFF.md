# Chat 05: research collaboration re-review

## Scope and status

Owner authorized this research journey on 2026-09-25, including one persistent
Workbench discussion. Frozen P0/stack remain authoritative. Read `AGENTS.md`,
`research-scope.md`, `PROJECT_STATE.md` and the latest `verification.md` entry.
Stop after QA/UI annotation; do not expand P0 or restart NFT-transfer tooling.

Phase 1 transfer-back A remains passed. B invalidation/return, C full production
auth lifecycle and D concurrent/interrupted/reverted issuance remain deferred.
The temporary Silver/steward fixture is retired with its history preserved.

## Review targets

- `supabase/migrations/202609250007_research.sql` through `202609250010_promotion_alias.sql`:
  table/RPC grants, immutable records, permission filtering, row/advisory locks,
  exact-version scope/independence, unique awards, demo authority boundary,
  correction-to-assignment propagation and human promotion prerequisites.
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
pnpm exec vitest run tests/unit/research.test.ts
pnpm exec vitest run --config vitest.database.config.ts tests/database/research.test.ts
# Opt-in hosted QA, only with the ignored fixture journal and normal app running:
pnpm exec playwright test --config playwright.research.config.ts
# Same fixture journey against the tracked production deployment:
$env:RESEARCH_TEST_URL='https://grindly-woad.vercel.app'
pnpm exec playwright test --config playwright.research.config.ts --project desktop
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

The first production fixture OTP assertion failed before research, with no safe
error-code diagnostic in that initial test. A rerun passed the complete hosted
journey; diagnostic status/code reporting was added without logging codes or
cookies. The original cause is not established, and the complete real-inbox/
expired-session production auth lifecycle remains unverified.
