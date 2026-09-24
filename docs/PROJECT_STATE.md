# Grindly: 05 - QA & Security checkpoint

Updated 2026-09-25. **Phase 1 is not complete. Stop before research workflows.**

## Approved sources

- `frozen-p0.md`: product authority, exactly six screens.
- `frozen-technical-architecture.md`: available approved stack; later approved sections are unavailable, not reconstructed.
- `build-phase-1.md`: approved implementation tasks/acceptance.
- `verification.md`: chronological actual results; latest section is the current evidence matrix.
- `runbook.md`: setup, migrations, service configuration, deployment operations.

## Implemented and verified

- Next.js/TypeScript/Tailwind/pnpm; Supabase invitation/email OTP and session-derived wallet proof.
- Six hosted migrations, forced RLS and revoked browser table/RPC access; generated database types.
- Real verified ERC721 on Robinhood Chain testnet 46630; durable mint/reconcile and existing-token binding.
- Token #1 minted, retried without duplication, transferred to a separately authenticated member and bound at epoch 2. Former owner denied despite remaining signed in.
- Workbench/My Membership live gates, Bronze/Silver metadata predicate, same-block owner/epoch reads and retryable fail-closed errors.
- Protected audit action live-success for recipient/live-denial for sender. Nonempty fixture identity/audit/promotion preservation tested in embedded Postgres, not later product histories.
- Three later-workflow routes now show an unavailable state only to current NFT members. No research workflow was added.

## Current infrastructure

- Repository: `baslaeth/grindly`, branch `codex/phase-1`; use `git rev-parse HEAD` for exact checkpoint.
- Local app: http://localhost:3000/join. Preserve both independent test sessions.
- Vercel: https://grindly-woad.vercel.app. Corrected source `f3c8bad4b017e2ed49b44bdae641642399b49e7a` is deployed READY as `dpl_AbRr3XPDP7o3J38tQXmaanQiRqBB`; manifest records the deployment. Subsequent documentation-only commits do not change the deployed executable source.
- Supabase: `errbtterppmvtlfltgzp`; migrations applied in dashboard, CLI migration history repair still required before db push (runbook).
- Contract: `0xa1f055b20c1bcbd0fa63859154a1fa283f11c356`; token #1 current owner `0x50579Ca09e9F37B803Dd8e6906Ead7426F4893c7`, epoch 2.
- Original owner / return recipient: `0xbbB383F167cfb3C848f111f2976c1820d88B9Edb`.
- Deployment/ABI: `../deployments/robinhood-testnet.json`, `../deployments/GrindlyMembership.abi.json`, `../deployments/app-testnet.json`.

## Blocking evidence

1. After corrected deployment, chain 46630 still reports the second wallet owns token #1 and has zero testnet ETH. First required manual action: fund that wallet at the official faucet. No transfer-back approval requested yet. Ask one exact action at a time.
2. After funding, request token #1 return transfer. Verify epoch increment, deny stale bindings/actions before rebind, rebind original owner and repeat reads/actions for both members. Compare the pre-existing eight audit events and two member/wallet rows against ignored `.local/qa-transfer-baseline.json`; allow new audit events, not edits/reassignment of old ones.
3. Live nonempty promotion invalidation is untested. Owner authorized an explicitly labeled demo Silver promotion with nonempty evidence. Verify Silver while valid, Bronze after transfer, unchanged attribution, and no automatic Silver revival after return/rebind. Never portray the fixture as earned reputation.
4. Approved architecture sections beyond section 1 need original source from owner. No replacements were invented.

Do not claim findings, XP, points, ranks, balances, or later work histories were preserved: they are not implemented. Other residual test gaps are explicit in `verification.md`.

## Chat 05 corrections

1. Existing-token binding requires two-confirmation owner/epoch agreement, sharing `REQUIRED_CONFIRMATIONS` with normal issuance. Latest-block access revocation is unchanged.
2. Reconciliation includes confirmed-but-unbound operations. Migration 006 records binding completion atomically and prevents recovery replacing later explicit binding history, active or revoked.
3. Revoked token/member history remains the observation high-water mark under existing locks; idempotent refresh advances the recorded block.
4. Protected membership/wallet routes use writable auth cookies. Chunk rotation is covered across successive simulated protected requests; actual production refresh remains live step C.
5. Returning-email requests have no member-email lookup: generic response/cookie with post-response non-signup delivery for every address, hiding provider status/throttle/latency differences from the application response.

Remaining live steps after corrected deployment: A transfer-back/access/attribution;
B labeled demo Silver transfer/return; C production OTP/returning/expiry refresh/sign-out
and authenticated direct DB/RPC denial; D concurrent issuance and interrupted/reverted
recovery. Request one exact manual action at a time. No Phase 2 work.

## QA commands and review targets

PowerShell from repository root:
```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm install --frozen-lockfile
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
git diff --check
```

Remediation: 92 unit, 68 database, 11 contract tests passed with lint/types/build/type drift. Chrome suite passed 34 tests. Mocked provider/chain tests are not live production evidence; PGlite is not a multi-connection concurrency test.

Focus Chat 05 on:
- `src/server/auth/`, `src/server/wallet/`, `src/server/membership/`, `src/server/http.ts`.
- `src/app/api/membership/check/route.ts`, `src/app/api/membership/bind/route.ts`, `src/app/api/membership/mint/route.ts`, `src/app/api/metadata/46630/[tokenId]/route.ts`.
- `src/components/membership-placeholder.tsx`, `src/components/membership-actions.tsx`, protected `src/app/*/page.tsx` reads.
- `supabase/migrations/`, `scripts/verify-hosted-security.sql`, `scripts/reconcile-mints.ts`.
- `tests/unit/membership-security.test.ts`, `membership-access.test.ts`, `ownership.test.ts`; `tests/database/issuance.test.ts`, `security.test.ts`; `tests/e2e/membership-boundary.spec.ts`.
- `contracts/contracts/GrindlyMembership.sol`, `contracts/test/`, `.github/workflows/ci.yml`.
- Remediation focus: `supabase/migrations/202609250006_qa_membership.sql`, `src/server/membership/reconciliation.ts`, `tests/unit/issuance-recovery.test.ts`, `reconciliation.test.ts`, `session-refresh.test.ts`, `returning-signin.test.ts`, and updated `ownership.test.ts` / `tests/database/issuance.test.ts`.

Secrets and signed transaction journals are ignored; never print or commit them. Untracked `docs/brand/` and `public/` are user work, excluded from this checkpoint. No unrelated changes should be reverted.
