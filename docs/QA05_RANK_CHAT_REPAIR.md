# Chat 05: rank-chat discoverability repair

Owner-authorized repair on `codex/mvp-rank-spaces`, starting at `5c88ec4`.
Local review: http://localhost:3000/workbench. Not the older Vercel website.

## Cause and changes

The port-3000 process was already running this repository's Next dev server.
The mismatch was in the interface: room selection initially showed the evidence
tab, a large research section preceded chat, and the directory was an anchor far
below the main content. These were real discoverability gaps, not a stale build.

- Each room opens Chat directly, including after leaving another room on Members.
  Rank/category heading, empty state, composer and retained history are together.
  Evidence, findings, review, opportunities and research questions remain accessible.
- Explicit recorded member count and Members action open the current-rank
  directory. It includes non-posters and members without a research profile;
  fictional examples and QA accounts are counted and labeled separately.
- Directory, actual message authors and fictional grinder/owner links use the
  same profile drawer. Back to chat preserves the selected room. Profile reviews
  retain exact-version attribution but exclude private findings and reviews.
- Stored research specialties are displayed instead of misleading default
  interests. Personal XP, illustrative delegated NFT progress, acquisition history
  and delegation relationships remain distinct. No new reward accounting.
- Mobile room selector has an explicit accessible name and handles choosing
  the already-current category from Members. No authorization, RPC,
  database policy, contract or hosted migration changes in this repair.

## Review targets

`src/components/{rank-space,space-controls,workbench-sections,research-views}.tsx`,
`src/research/model.ts`, `tests/unit/profile-history.test.ts`,
`tests/database/rank-spaces.test.ts`, and the new browser tests below.

```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e
pnpm exec playwright test --config playwright.research.config.ts rank-click-path.spec.ts --grep 'routing|Members directory'
$env:GRINDLY_ROOM_WRITES='1'
pnpm exec playwright test --config playwright.research.config.ts rank-click-path.spec.ts --grep persistence
$env:GRINDLY_RANK_SCREENSHOTS='.local/rank-boundary-screens'
pnpm exec playwright test --config playwright.research.config.ts journey.spec.ts rank-spaces.spec.ts
git diff --check
```

Use the existing ignored isolated QA journal. The click-path suite goes through
visible room controls and author/directory links; direct URL/API boundary tests
are separate evidence, not a substitute. Persistence mode writes explicitly
labeled QA messages only, checks reload/reply isolation and no message XP award.
Screenshots are in `docs/rank-chat-repair/{desktop,mobile}/`; genuine directory
identities are masked. Existing records are not deleted to shorten the history.

Read-only older-executable compatibility check (no research writes):

```powershell
$env:RESEARCH_TEST_URL='https://grindly-woad.vercel.app'
$env:GRINDLY_HOSTED_COMPAT='1'
pnpm exec playwright test --config playwright.research.config.ts hosted-rank-compat.spec.ts --project desktop
```

Results: 130 unit, 144 database, 11 contract and 46 foundation browser tests pass;
six unique click-path cases pass across final focused runs, two rank-boundary
and two full research journeys pass. Hosted compatibility repeat passes, but
one hosted Membership and one local profile unavailable response remain recorded.
No diagnosis of their underlying cause is claimed. Full results and corrected
harness failures are in the latest `verification.md` entry. Positive live Silver,
live tier continuity, genuine production auth lifecycle and issuance recovery
remain unverified/deferred as previously recorded. Production is not being
deployed or declared ready by this repair.
