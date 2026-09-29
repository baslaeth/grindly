# Chat 05: Category Alpha Review

Review `codex/category-alpha-review`, based on `0d58c9d`, not the older hosted
website. Local URL: http://localhost:3000/. Annotation checkpoint `ce19a1f` and
top-right My Profile remain. Final commit/push and browser totals are in the
latest `verification.md` entry. No production deployment or merge.

## Classifications

| Requested experience | Classification and evidence boundary |
| --- | --- |
| Home, public samples, own-rank Hub, top-right Profile | WORKING in isolated browser sessions; existing genuine gating retained |
| Text/replies/reactions/private images and GIFs, drafts, retry, history, unread, editing/deletion | WORKING in existing connected-member browser regressions; no XP for chat |
| Bronze ten-room access and navigation | WORKING in actual isolated browser sessions with current testnet ownership |
| Silver/Gold/Platinum/Diamond ten-room access | LABELED EXAMPLE in simulated boundary tests; implemented, but live membership unverified |
| Category-first forms and six types | WORKING browser paths for Traders and Project Analysts; all nine implemented and unit-validated, seven other category-specific browser paths unverified |
| Message-linked contribution and original attribution, image-only evidence, immutable corrections | WORKING in browser/database tests; self-reported first-noticed time is not priority proof |
| Same-rank Pending review, sourced feedback, independent correction/acceptance | WORKING in isolated browser journeys; private/demo boundaries tested |
| Category-scoped rejection and independent appeals | BLOCKED for end-to-end sign-off: database mechanism/UI implemented and database-tested, rejection/appeal browser path unverified |
| Existing 25 XP/25 seasonal points acceptance policy | LABELED EXAMPLE: actual isolated ledger entries, once per finding; no new award formula |
| Genuine category awards and production review staffing | BLOCKED: no approved genuine rule in `alpha_award_authorizations`, no genuine category scopes appointed |
| Real preliminary AI review and semantic paraphrase detection | BLOCKED/unverified: OpenAI approved, key explicitly deferred; no real invocation or saved model card |
| Deterministic checks and persisted public-source observations | WORKING; source times, bounded snapshots/digests, missing data kept Unknown |
| Provider failure, unsafe output, prompt-injection/authority boundary | LABELED EXAMPLE in deterministic/mock regressions; real-model behavior BLOCKED/unverified |
| Due-only outcome observations | WORKING browser-triggered pending/inconclusive mechanism on desktop/mobile; synthetic matured records are LABELED EXAMPLE, never successful real predictions |
| Category counts, linked history, current/next NFT, disabled Claim $GRIND | WORKING recorded-data rendering; no percentage, universal win rate or XP-to-token conversion |
| Genuine delegated work | NOT IMPLEMENTED as an active workflow; existing display-only accounting retained, no genuine records available to verify |
| Opportunity eligibility and sample interest | WORKING existing sample/browser and database flows; fictional cards remain isolated |
| Opportunity operator editor | BLOCKED for live browser verification: no owner-designated isolated steward; existing permission tests pass |
| Automatic scheduled outcomes, human known/mixed outcome-entry UI | NOT IMPLEMENTED; due checks are explicitly triggered, missing historical data stays inconclusive/pending |
| Claims, burns, upgrades, teams/votes/splits, marketplace/subscriptions | NOT IMPLEMENTED/inactive by scope, not promised features |

## AI and Source Coverage

All nine categories have tailored input and deterministic baseline checks for
evidence, identifiers, immutable timestamps, missing fields and permitted prior
work. Subject/contract/source matches are review hints, never accusations or
automatic rejection. Semantic paraphrases require the real model and remain
unverified; deterministic matching is not called AI.

- Traders: real read-only Coinbase BTC/ETH spot ticker, bid/ask, volume and source
  timestamp, checked for freshness. ETH was live-probed and persisted through an
  isolated browser submission. No price prediction, historical return or liquidity
  depth conclusion is inferred.
- Project Analysts: bounded primary documentation retrieval with checked time,
  declared publication time when available, text snapshot and SHA-256. Robinhood
  Chain documentation was live-probed. Documentation is not verified traction.
- Whitelist, Airdrop, Presale, Seed/Early Stage, Meta Catchers: same allowlisted
  document baseline; eligibility, snapshots, campaign status, vesting, company
  diligence and emerging-pattern outcomes are not deeply automated.
- Degens and NFT Specialists: implemented Robinhood Chain testnet-only bytecode
  and transaction/block-consistency observations when compatible evidence is
  supplied. No live end-to-end category probe yet; security audit, holder
  concentration, NFT rights and liquidity risk are Unknown, not certified.

Primary source allowlist: `docs.robinhood.com`, legacy `docs.chain.robinhood.com`,
`ethereum.org`, `docs.cdp.coinbase.com`. HTTPS, no URL credentials/query/fragment,
no redirects, bounded body/deadline. Unsupported URLs remain references for human
review, not silently fetched. No arbitrary web browsing or model tools.

OpenAI Responses boundary: server-only credential, default `gpt-5-mini`, strict
structured card, `store:false`, constrained source/candidate IDs, no tools, no
approval or award capability. Both member text and source excerpts are untrusted.
Approval covers QA and genuine submissions, but no key is configured by owner
choice. `store:false` is not a promise of zero provider retention; consult the
[OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
before enabling genuine production processing. Images are currently human-review
evidence, not sent as vision inputs. No sample model cards are seeded.

## Review Targets

- `src/alpha/{model,checks}.ts`: validation, deterministic candidates, counts.
- `src/server/alpha/{service,provider,sources}.ts`, `src/app/api/alpha/route.ts`:
  live membership, processing permissions, safe retrieval, failure persistence.
- Migrations `202609290023_category_alpha.sql`, `024_preliminary_review.sql`,
  `025_alpha_feedback.sql`: immutable versions, explicit category authority,
  member/demo/rank isolation, atomic one-time awards, RLS, appeals and outcomes.
- `src/server/research/service.ts`: additive snapshot; legacy compatibility only
  on missing-function PGRST202, never on auth/provider errors.
- `src/components/alpha-*.tsx`, `research-views.tsx`, `rank-space.tsx`:
  category editor, preliminary blocked state, same-rank sharing, profile records.
- `tests/database/alpha*.test.ts`, `tests/unit/alpha*.test.ts`,
  `tests/live-research/{category-alpha,alpha-outcome,journey}.spec.ts`.

## Commands and Review Path

```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm check
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
pnpm test:e2e --workers=2
node node_modules/@playwright/test/cli.js test --config playwright.research.config.ts tests/live-research/category-alpha.spec.ts tests/live-research/alpha-outcome.spec.ts tests/live-research/alpha-profile-view.spec.ts tests/live-research/journey.spec.ts tests/live-research/member-chat.spec.ts tests/live-research/public-home.spec.ts --output .local/alpha-browser-results
git diff --check
```

Use the existing isolated `project`, `risk`, `operations` fixture sessions via
the guarded harness. They have genuine Bronze testnet ownership, but their
research, reviews and awards are synthetic. Generated fixture OTPs are not inbox
delivery evidence. Never copy the founder session or grant genuine reviewer roles.

Judge path: Home -> Enter Hub -> Traders -> Submit alpha -> pending record ->
source checks (AI blocked, no card) -> independent Review Desk -> correction ->
acceptance -> top-right My Profile -> recorded award and Activity -> same-rank
accepted brief. Message actions preserve the original author's attribution.
Samples on Home use the separate illustrative experience, not real partnerships.

Screenshots: `docs/alpha-review/{desktop,mobile}/` includes the correction editor,
My Profile, pending market evidence, blocked preliminary review and due outcome.
Refreshed chat/member/sample captures are in `docs/member-experience-review/`.
Fixture history is retained, not removed to make screenshots look empty. No video
was captured because the Playwright ffmpeg dependency was unavailable.

Migrations 023-025 were explicitly approved and applied with complete pre-existing
table digests unchanged, forced RLS and browser-RPC denial asserted. The test
fixture script adds only two category scopes to each of the three existing demo
reviewers, with audit records. No genuine research was changed. Do not rerun the
generated migration on the hosted database. CLI migration-history repair remains
an operations prerequisite before ordinary `supabase db push`.

Remaining historical Phase 1, live Silver/transfer and intermittent ownership
availability checks stay deferred. This checkpoint is not production-ready or
evidence of customer validation. UI annotation and isolated supervised review
can proceed while real AI remains explicitly blocked.
