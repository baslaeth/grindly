# Grindly: production ownership diagnostic checkpoint

Updated 2026-09-25. The owner authorized research implementation despite the
deferred live promotion-invalidation test. **Not fully Phase 1 verified or
production-ready.** Stop at independent QA and UI annotation, not new workflows.

## Authority

- `frozen-p0.md`: unchanged product thesis and six screens.
- `frozen-technical-architecture.md`: available approved stack; missing later
  source sections remain unavailable, not reconstructed.
- `research-scope.md`: latest authorization; only new product addition is the
  persistent specialist discussion inside Workbench.
- `verification.md`: chronological evidence, including preserved Phase 1 passes.
- `runbook.md`, `research-runbook.md`: operations and fixture boundaries.
- `QA05_RESEARCH_HANDOFF.md`: independent review targets and commands.

## Working implementation

- Same Next.js/Supabase/Vercel/testnet stack. Six routes: `/join`, `/workbench`,
  `/findings/new`, `/review`, `/findings/[id]`, `/membership`. Old Submit and
  Contribution URLs redirect; no seventh product screen.
- Live membership gates every research read/action. Eleven SQL migrations, 24
  forced-RLS tables, service-only RPCs and generated database types.
- One question, readable specialties, profiles and ownership-derived tiers;
  persistent discussion/replies with source links and immutable attribution.
- Structured immutable finding versions, corrections, scoped permissions,
  assigned independent review, conflicts and independently routed disputes.
- Atomic acceptance/initial award, unique finding award ledger, lifetime XP and
  seasonal points, deterministic permission-filtered evidence brief and lineage.
- Human Silver assessment against documented demo thresholds, Silver peer
  requests, and one explicitly unfunded fixed-fee demonstration assignment.
  Work acceptance is separate from payment; no payout or escrow is implemented.
- Public fictional example before sign-in. Three isolated, visibly labeled QA
  personas also supply persistent synthetic work; they are not real specialists,
  customer validation or production review staff. Demo actors cannot dispute,
  endorse for promotion, reassign reviews of, or promote genuine work/members;
  demo reviewers cannot read restricted genuine findings or approve genuine work.

## QA05 remediation

- Owner reports Chat 05 independently passed every previous High/Medium finding;
  no new critical/high/medium application defect was confirmed. The original
  review document remains historical evidence, not the current defect status.
- Migration 011 checks demo/real compatibility before dispute/usefulness/routing/
  promotion writes. Historical incompatible usefulness remains attributed and
  visible, labeled, and non-qualifying. Promotion insertion also has a DB guard.
- Snapshot lineage redacts inaccessible target IDs per recipient. Revoked role,
  specialty scope or demo boundary closes an open assignment with an audit event
  before selecting a qualified independent replacement. With no replacement,
  the version remains awaiting review, never automatically accepted.
- Correction/review/membership/API reads skip irrelevant peer tier enrichment;
  acting-member live ownership checks remain mandatory. Workbench/record displays
  still request current peer tiers. RPC timeout/retry policy is unchanged.
- Safe ownership diagnostics distinguish network, transport/provider/timeout and
  block consistency. Research API response IDs correlate safe server events.
- Harness follows the actual reviewer after correction and persists sanitized
  failure diagnostics. Immediate evidence-brief jump, compact mobile navigation,
  and author-directed correction wording are included; no redesign/new workflow.

## Preserved Phase 1 results and deferred checks

- Live transfer-back A **passed**: token #1 returned to original owner at epoch 3;
  both stale bindings failed, fresh original-owner binding succeeded, protected
  reads/actions followed ownership. Two member rows, two wallet rows and eight
  pre-existing audit rows retained their digests and attribution.
- B valid-demo Silver baseline passed previously. The transfer-invalidation and
  return/no-revival parts are explicitly **deferred**, not failed or completed.
  Demo promotion `72057bb3-9d84-42a4-9a0b-cdb2be12cd2d` was revoked and only the
  temporary Member 2 steward grant removed, with new cleanup audit events.
- C full production inbox OTP/returning/expired-session refresh/sign-out/direct
  authenticated database-denial lifecycle remains unverified. Isolated generated
  QA OTPs do not complete it.
- D hosted concurrent issuance and interrupted/reverted recovery remain deferred.
  Sequential QA minting and concurrent research review tests do not complete D.
- Earlier five Chat 05 security fixes and their passing regressions are retained.
  No retroactive preservation claim for formerly unimplemented research histories.

## Current infrastructure and operational gaps

- Repository `baslaeth/grindly`, branch `codex/phase-1`; `git rev-parse HEAD` gives
  the exact checkout. Executable deployment identity: `deployments/app-testnet.json`.
- Local app: http://localhost:3000/workbench. Stable production URL:
  https://grindly-woad.vercel.app. Executable source `a89e4d5` is deployed READY as
  `dpl_ENeKY144qwEBSAKxbJ73RUYwRUvx`; later evidence-only commits do not alter
  the deployed application. See the latest verification entry for CI/live results.
- Supabase `errbtterppmvtlfltgzp`: all eleven migrations applied via dashboard;
  repair CLI migration history before `db push` (see runbook).
- Contract `0xa1f055b20c1bcbd0fa63859154a1fa283f11c356`, chain 46630 only.
  Token #1 remains the original member's token; QA fixtures use tokens #2-4.
- **Real reviewer/steward roster needs owner designation.** Unstaffed genuine
  findings wait visibly; the app never promotes specialties/tiers into authority.
- No real customer/funder commitment, settlement or paid-work evidence. Demo
  compensation is testnet-only with no monetary value.
- Human research assessment, actual Silver progression/peer-request use and
  deferred Phase 1 live checks remain outstanding. Prior High/Medium remediation
  re-review passed per the owner; this diagnostic increment is available for QA.
- Chat 05 independently passed local desktop/mobile and production desktop on
  `fa03134`; that supersedes the earlier missing clean rerun, not its historical
  failures. The old ownership 503 cause remains unknown and was not reproduced.
  Current executable journey outcomes are in the latest verification entry.
- Remediation local desktop/mobile **passed**; production mobile **passed**.
  Two production desktop attempts **failed** on mandatory ownership reads, at
  correction entry and Membership respectively. Safe Vercel diagnostics show
  `ownership.owner / rpc_transport`; provider-level cause remains unknown.
  A clean full production desktop journey on `e8b7426` is still unverified.
  Those historical failures remain failures, not retroactively passing runs.

## Focused reliability pass (2026-09-25)

- Added bounded, allowlisted failure fields: numeric JSON-RPC response code,
  upstream HTTP status, transport/error type, actual per-stage HTTP attempts,
  elapsed milliseconds and request correlation. No upstream text/payloads,
  URLs, cookies, signatures or secrets. API metadata now returns X-Request-ID.
- Local and Vercel diagnostics confirm the same documented public testnet RPC.
  Direct raw RPC, local viem ownership, local metadata and production metadata
  each passed 10 sequential plus 6 concurrency-two reads: **64/64** total.
- Authenticated read-only QA probes: local mobile **4/4 pages**, production
  desktop/mobile **8/8 pages**, no research mutations. These are not new full
  mutation journeys or genuine-inbox authentication evidence.
- **Diagnosis E: insufficient evidence.** No failure reproduced; no new Vercel
  failure event found in the probe window. Evidence does not distinguish provider,
  Vercel/network, application client or concurrency sensitivity. Historical
  intermittent availability is unresolved, not fixed by these passing samples.
- No ownership reliability workaround was justified or added. Fail-closed gates,
  same-block checks, confirmation depth, 10-second timeout and retry count remain.
- Mobile shell rows now `max-content 1fr`. Short denied pages and populated
  Workbench/Membership screenshots inspected; populated mobile sidebar is 67px,
  with no horizontal overflow. No redesign or new feature.
- UI annotation and isolated supervised demo testing can proceed. Genuine-user
  reliability sign-off remains withheld while intermittent failures are unexplained;
  reviewer/steward staffing and the documented live gaps also remain.

## Verification commands

```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm install --frozen-lockfile
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
git diff --check
# Opt-in isolated live QA only, with an already-running application:
pnpm exec playwright test --config playwright.research.config.ts
```

Latest completed local suites: 120 unit, 122 database, 11 contract, 38 foundation
browser tests, plus the read-only live probes above. See the
latest verification entry for final reruns and deployed results. Embedded SQL
tests are single-connection, not a hosted contention benchmark.

Secrets and test-wallet journals stay ignored. Preserve unrelated `docs/brand/`
and `public/` user assets. Only the existing approved black-transparent logo is
used by this checkpoint; no brand redesign or new contract.
