# Grindly: research collaboration checkpoint

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
- Live membership gates every research read/action. Ten SQL migrations, 24
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
  customer validation or production review staff. Demo reviewers cannot read
  restricted genuine findings or approve genuine work.

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
  https://grindly-woad.vercel.app. Executable source `fa03134` is deployed READY as
  `dpl_PiMbt2Yq2dzg5pVpMWBzBypV8vrd`; later evidence/test-only commits do not alter
  the deployed application. CI for the executable source passed.
- Supabase `errbtterppmvtlfltgzp`: all ten migrations applied via dashboard;
  repair CLI migration history before `db push` (see runbook).
- Contract `0xa1f055b20c1bcbd0fa63859154a1fa283f11c356`, chain 46630 only.
  Token #1 remains the original member's token; QA fixtures use tokens #2-4.
- **Real reviewer/steward roster needs owner designation.** Unstaffed genuine
  findings wait visibly; the app never promotes specialties/tiers into authority.
- No real customer/funder commitment, settlement or paid-work evidence. Demo
  compensation is testnet-only with no monetary value.
- Independent Chat 05 re-review, human research assessment, actual Silver
  progression/peer-request use and deferred Phase 1 live checks remain outstanding.
- Hosted journey passed on `fd87bca`. Final `fa03134` reruns failed on a retryable
  ownership RPC error and a later correction-form timeout; a clean full final-
  deployment run remains unverified. Investigate hosting/RPC latency without
  weakening the gate. Local authenticated desktop/mobile journeys remain passed.

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

Latest completed local suites: 100 unit, 111 database, 11 contract, 38 foundation
browser tests; two authenticated live QA journeys (desktop/mobile). See the
latest verification entry for final reruns and deployed results. Embedded SQL
tests are single-connection, not a hosted contention benchmark.

Secrets and test-wallet journals stay ignored. Preserve unrelated `docs/brand/`
and `public/` user assets. Only the existing approved black-transparent logo is
used by this checkpoint; no brand redesign or new contract.
