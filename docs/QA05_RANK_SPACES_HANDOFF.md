# Chat 05: bounded rank-spaces review

Review `codex/mvp-rank-spaces` against saved UI base `1862bb3`.
Current authority is `mvp-rank-spaces.md`; do not enforce the superseded
reset-to-Bronze-on-sale expectation. No production executable deployment.

## High-signal targets

- Migrations 012-015: exact-rank service-only snapshot/mutation/routing, existing
  private-lineage and demo/genuine boundaries, stale reviewer rank, and legacy
  executable fail-closed guard. Inspect source-message and related-version paths.
- `src/server/research/service.ts`: session-derived live binding ID on v2 RPCs;
  direct room/profile/finding/version/message lookup denies unavailable targets;
  tier race fails closed. Directory enrichment uses no per-person ownership calls.
- `src/server/membership/metadata.ts`, migration 012: durable NFT Silver event,
  Bronze default, transfer/return continuity, immutable member-owned ledger and
  acquisition attribution. Revoking an old approval does not invent a demotion.
- `src/components/rank-space.tsx`, `space-controls.tsx`, `research-views.tsx`:
  same six routes, reusable rooms/profile drawer, current-rank directory only,
  profile history excludes private records, truthful recorded/demo counts,
  separate author/delegate/owner links and personal versus fictional NFT XP.
- Existing specialty is not reviewer role or category-room permission. Display
  examples have no auth accounts, signatures, grants, ledger entries or live NFTs.
- Shared Supabase schema is updated, production executable is not. Legacy Bronze
  calls use filtered v2 logic; legacy Silver research calls intentionally deny.
  No deployment should occur without an explicit owner instruction.

## Commands and evidence

Use Node/pnpm versions from `package.json`, `NODE_USE_SYSTEM_CA=1` on Windows.

```powershell
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
pnpm exec playwright test --config playwright.research.config.ts journey.spec.ts rank-spaces.spec.ts
git diff --check
```

Live research suite requires the ignored existing QA journal and running local
app. It uses normal app session verification with operator-generated QA codes,
not real inbox delivery. Never copy genuine browser sessions or introduce an
authentication bypass. `rank-spaces.spec.ts` is local-only and refuses captures
of genuine research; genuine directory names are masked in its screenshots.

Focused: `tests/database/rank-spaces.test.ts`, updated `research.test.ts` and
`security.test.ts`, unit `research-editor.test.ts`, `research.test.ts`,
`membership-security.test.ts`, `membership-access.test.ts`. Database fixtures
exercise both ranks and transfer-back without a wallet. Live local journeys use
existing Bronze QA NFTs. Do not confuse those two evidence classes.

Screenshots: `docs/rank-spaces-review/{desktop,mobile}/`. Latest verification
entry records exact executed totals, failures corrected, and remaining gaps.
No economics, real delegation, native token, payouts, marketplace, leaderboard,
new animation, contract deployment or manual transfer exercise belongs to this pass.
