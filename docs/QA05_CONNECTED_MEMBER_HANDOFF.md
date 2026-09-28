# Chat 05: Connected member experience

Review `codex/connected-member-experience`, based on annotation commit `ce19a1f`.
Executable review is local: http://localhost:3000/. Production is unchanged.
Authority: `connected-member-experience.md`; this is not an economics decision.
Tested executable `7c7e4c08b567e62e9eece68d75597a8bd089e290` is pushed and remote
verified; the following documentation-only commit records the outcome. Review
feature-branch HEAD, including backend `5eac06e` and preserved annotations `ce19a1f`.

## Review targets

- Migrations 016-022: exact rank, demo/genuine compatibility, immutable message
  revisions and source links, attachment ownership/visibility, same-request
  serialization, actual read state, atomic activity and opportunity eligibility.
  Inspect old v1/v2 research compatibility as well as the new v3 snapshots.
- `src/server/chat/`, `src/app/api/chat/`: live ownership before private reads,
  writes and media; decoded/re-encoded content, bounded size/pixels/frames,
  authenticated no-store media. Deleted chat media is denied except through a
  permitted finding's immutable source version. No public bucket or media URL.
- `src/components/room-chat.tsx`, `src/chat/`: compact chat, stable request IDs,
  failed-send retention, IndexedDB attachment drafts, logout cleanup, incremental
  polling and unread state. Polling is visible-tab-only, eight seconds, no full
  page refresh. No ownership caching/fallback or decorative blockchain reads.
- `src/app/page.tsx`, `src/server/opportunities.ts`, opportunity components:
  public projection excludes protected URLs; actions recheck membership, exact
  per-card eligible ranks, dates and operator-verified prerequisites. Existing
  steward authority only. Demo operators/candidates cannot affect genuine cards.
- `research-views.tsx`, `member-activity.tsx`, `rank-space.tsx`: pending/correction/
  accepted states, independent reviewer routing and single actual award, own
  activity, permitted profiles, genuine counts, inactive claims and truthful
  current/next NFT display. No invented delegated ledger or scoring formula.

## Verification commands

PowerShell, repository root, compatible Node and pnpm per `package.json`:

```powershell
$env:NODE_USE_SYSTEM_CA='1'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm check
pnpm test:e2e
pnpm exec playwright test --config playwright.research.config.ts tests/live-research/member-chat.spec.ts
pnpm exec playwright test --config playwright.research.config.ts tests/live-research/journey.spec.ts
pnpm exec playwright test --config playwright.research.config.ts tests/live-research/public-home.spec.ts
git diff --check
```

The authenticated suites require the running local app, existing ignored fixture journal,
and isolated QA identities with actual Bronze testnet NFTs. They do not copy a
human browser session or bypass auth. Do not create reviewer roles or change
genuine records to make tests pass. Silver/higher ranks are deterministic database
fixtures only; do not call them live NFT evidence.

Focused tests: `tests/database/connected-member.test.ts`, `security.test.ts`,
`tests/unit/chat.test.ts`, `member-access.test.ts`, existing research security,
concurrency, editor, wallet, access and session suites. Browser evidence under
`docs/member-experience-review/`; only isolated sample identities are captured.

## Operational bounds

- Private images/GIFs are sanitized and stored in service-only Postgres for this
  bounded implementation: 2 MB/file, four attachments/message, 100 frames and
  16 million decoded pixels, 12 uploads/minute and 50 MB/member/day. No new storage
  service, public caching or third-party image requests. Plan storage/retention
  capacity before larger usage; unused upload rows are not automatically purged.
- No public claim flow exists. $GRIND stays disabled; no claims/balances fabricated.
  Opportunity claims cannot be activated from the operator editor either.
- Genuine delegation records do not exist in the current model. Profiles honestly
  show none; old fictional owner/grinder fixtures are not live delegated credit.
- Thresholds, burns, delegate submission/access/crediting rules require a founder
  decision. Genuine evaluation needs an already independently authorized scoped
  reviewer; unstaffed submissions stay pending. No reviewer was appointed here.
- No genuine campaign/partner details supplied. The sample area is separate and
  never makes an external application, allocation promise or claim.
- Prior deferred transfer/promotion tests and intermittent RPC availability remain
  unresolved; UI and successful isolated journeys do not establish readiness.

Final totals, failures/repeats, hosted compatibility and commit/push evidence:
see the 2026-09-29 entry in `verification.md`.

## Results at this checkpoint

- Complete deterministic check: 149 unit, 173 database, 11 contract tests;
  lint, typecheck, database type drift and production build pass.
- Chrome foundation: 48 passed. Actual local browser suite: 12 passed across
  desktop/mobile, two operator tests skipped (no isolated steward); this includes
  the separately run unread/empty-display scenarios. No new reviewer or steward
  role was granted. Actual live tiers here are Bronze only.
- Older production read-only compatibility: one passed, four protected screens
  and metadata, no page errors or research writes. Run explicitly with
  `GRINDLY_HOSTED_COMPAT=1`, `RESEARCH_TEST_URL=https://grindly-woad.vercel.app`,
  `pnpm exec playwright test --config playwright.research.config.ts tests/live-research/hosted-rank-compat.spec.ts --project desktop`.
- Twelve sanitized screenshots: `docs/member-experience-review/{desktop,mobile}/`
  contains chat, Members, profile, My Profile, signed-in sample Home and public
  sample Home. All authenticated captures are labeled isolated test identities.
  No interaction recording: Playwright's encoder installation timed out at the
  official CDN. Screenshots and persistent browser assertions are the evidence.
- Founder decisions still needed: promotion thresholds/burns and delegate
  submission/access/accounting. Real campaigns require operator-supplied terms;
  live editor verification requires an existing or owner-designated isolated
  steward. Genuine independent reviewer staffing is not inferred from specialty.
