<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Grindly Handoff

Latest addition: `docs/evidence-sources.md`. Owner-approved migration 026 was
applied through the authenticated Supabase SQL editor on 2026-09-30. The prepared
026-only transaction passed all old-table digest, forced-RLS and browser-RPC
assertions. Catalog postflight: source_checks/submit_v2 present; zero unprotected
tables and zero browser RPC grants. Do not reapply or edit 023-026. See latest
verification for actual shared journeys, free probes and optional local AI status.
No paid calls, genuine reviewer appointments, awards or production deployment.

Latest refinement: `docs/evaluation-foundation.md` (2026-09-30), continuing the
same branch from reviewed `40addac`. Migration 026 is now shared-applied with
preservation checks; the previous authentication/approval blocker is resolved. Source checks
never invoke a model, even if a key later appears. See the current handoff and
verification entry for precise classifications; no production deployment.

Prior authority: `docs/category-alpha-review.md` (2026-09-30), extending the
connected member brief on `codex/category-alpha-review`. Preserve annotations
`ce19a1f` and base `0d58c9d`. Migrations 023-025 have explicit owner approval and
are applied to the shared database with preservation assertions. Do not reapply
them or edit applied SQL; the older production executable is unchanged.
OpenAI is approved for QA and genuine submissions, but the owner explicitly
declined adding the key for now. Real OpenAI calls are BLOCKED/unverified; never
substitute sample output. Do not ask for the key again. Genuine category XP
requires an owner-approved rule, and genuine reviewers require designated scopes.
Read `docs/QA05_CATEGORY_ALPHA_HANDOFF.md` for boundaries and verification.
Tested feature-branch push is authorized; merge/deployment are not.

Prior authority: `docs/connected-member-experience.md` (2026-09-29). Home is
now the main public route; Hub recognizes all five exact NFT ranks. My Profile
remains top-right. Implement compact private chat, isolated samples, public
opportunities with independent eligibility, and evaluation/activity linkage on
`codex/connected-member-experience`. No claims, upgrade economics, delegation
activation, manual transfer tests, merge or production deployment. A tested
feature-branch push is authorized. Preserve annotation checkpoint `ce19a1f`.

Historical base: the 2026-09-28 bounded owner brief in `docs/mvp-rank-spaces.md`
superseded earlier rank assumptions. Bronze/Silver were the initial exact-rank
spaces; NFT tier persists on transfer, personal XP does not transfer. No new
manual NFT transfer, economics finalization, delegation activation or production
deployment is authorized. See `docs/QA05_RANK_SPACES_HANDOFF.md` for review.
The subsequent chat/profile discoverability repair is documented in
`docs/QA05_RANK_CHAT_REPAIR.md`. Feature-branch push to `baslaeth/grindly` is
authorized; merge, force-push and production deployment are not.

Read these before changing scope or implementation:

- `docs/frozen-p0.md`: approved product scope.
- `docs/frozen-technical-architecture.md`: supplied architecture and source-completeness warning. Missing approved sections must not be invented.
- `docs/build-phase-1.md`: approved Phase 1 acceptance checklist.
- `docs/PROJECT_STATE.md`: current checkpoint and blockers.
- `docs/connected-member-experience.md` and `docs/QA05_CONNECTED_MEMBER_HANDOFF.md`:
  latest authority, feature classifications and exact local review commands.
- `docs/verification.md`: chronological evidence; distinguish live, simulated, user-reported, and untested results.
- `docs/runbook.md`: setup, service configuration and operations.
- `docs/research-scope.md` and `docs/research-runbook.md`: authorized collaboration scope and operations.
- `docs/ui-direction.md`: owner-authorized six-screen redesign and local-only UI
  review on `codex/ui-specialist-workspace`. Do not deploy this UI checkpoint
  to production without a new instruction. Preserve the reliability/security base.
- `docs/mvp-rank-spaces.md`: current bounded rooms/profiles/tier authorization;
  feature branch `codex/mvp-rank-spaces` retains the approved UI checkpoint.

The 2026-09-25 owner authorization permits the research collaboration journey;
see `docs/research-scope.md`. Stop at its QA/UI-annotation checkpoint. Phase 1
still has explicitly deferred live checks; do not call it fully verified.
Use only Robinhood Chain testnet (46630). Ask for wallet approvals one exact action
at a time. Never request private keys, copy browser sessions, or manufacture live
promotion evidence. Empty/unimplemented histories do not prove preservation.

Commands (pnpm 11.19.0, compatible Node per package.json):

- `pnpm install --frozen-lockfile`
- `pnpm check`: lint, typecheck, unit, database, database type drift, contract tests, build.
- `pnpm test:e2e`: foundation-mode browser tests on port 3100; not live OTP/NFT evidence.
- `pnpm dev`: local app, normally http://localhost:3000/ (Home).
- `pnpm exec playwright test --config playwright.research.config.ts`: opt-in live
  QA identities only, with an already-running app and ignored fixture journal.
  This is not real inbox delivery, independent human research, or deferred NFT
  invalidation evidence. Never grant demo reviewers authority over genuine work.

Windows: set `$env:NODE_USE_SYSTEM_CA='1'` for Node network requests, retaining TLS
verification. Set `$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'` to use installed Chrome
for E2E, or install bundled Chromium with `pnpm exec playwright install chromium`.
Keep `.env.local`, `.local/`, and transaction/signature secrets uncommitted. Preserve
unrelated user changes, including untracked `docs/brand/` and `public/`.
