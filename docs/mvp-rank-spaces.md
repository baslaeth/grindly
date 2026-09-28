# MVP rank spaces: owner authorization, 2026-09-28

This bounded brief supersedes conflicting older product assumptions for this
task. Preserve the existing application, charcoal/white redesign, approved logo,
working research flow and security fixes. Do not finalize economics or rebuild
the application. Base checkpoint: `1862bb3`, saved as
`codex/checkpoint-ui-1862bb3`. Implementation branch: `codex/mvp-rank-spaces`.
Unrelated untracked brand files stay untouched. Stop before production deployment.

## Two rank spaces

Implement Bronze and Silver only, each with ten persistent rooms:

1. General
2. Whitelist Hunters
3. Airdrop Hunters
4. Presale Hunters
5. Degens
6. Traders
7. Project Analysts
8. Seed and Early Stage Investors
9. NFT Specialists
10. Meta Catchers

Use one reusable room interface, not twenty separately built pages. All members
within a rank can browse that rank's category rooms. Specialty describes interests
or expertise, not reviewer authority. Access is exact-rank, not hierarchical:
Silver does not automatically access Bronze. Enforce this on server reads/actions
for messages, findings, replies, summaries, member lists and linked records.
Gold, Platinum and Diamond remain future spaces, not functioning empty rooms.

## Members and profiles

Show the current space's member count and clickable member list, not online
counts without actual presence tracking. One reusable profile drawer/page shows:
name, avatar, short bio, specialty; NFT tier and recorded acquisition history
(newly issued, progressed or purchased); personally earned XP; XP contributed
toward that NFT through delegated work; current/past delegates where applicable;
attributed contributions, review states and relevant history.

Personal XP follows the person. Delegated NFT progress must not become the
owner's personal expertise or be double-counted. Do not infer purchased from
every wallet transfer: show unknown provenance honestly. Profiles must expose
neither emails, private records nor another rank's chat history.

## Delegation display

Demonstrate clear attribution: "Alex - working for David's NFT."
Alex opens Alex's profile; David's NFT/profile is separately linked. If David
posts personally, David is the author. Implement profile/display structure and
clearly labeled delegation examples only. No delegation contracts, reward
splits, cross-rank delegate access or unapproved progression formulas.

## NFT rule correction

New NFTs start at Bronze. A sold NFT retains its tier and tier access. A buyer
never inherits the seller's personal XP, reputation, contributions or earned
balances. The old reset-to-Bronze-on-sale assumption is superseded. Separate NFT
tier from personal standing in access and metadata, with automated regression
coverage; do not merely relabel the UI. No invented demotion rules, burn costs
or production upgrade thresholds. Unfinished live verification remains explicitly
deferred. No new manual NFT-transfer exercise in this pass.

## Demo content and existing product

Nine distinct fictional profiles cover the nine categories, distributed across
Bronze and Silver. Reuse suitable isolated QA fixtures rather than unnecessary
accounts or new wallet setup. Clearly label sample profiles, XP, conversations
and counts; none is traction. Use a few coherent complementary conversations,
not repetitive fake chatter in every room. Empty rooms stay honestly empty.

Retain discussion -> finding -> independent review -> credit/history within the
correct rank. Add compact Your progress using actual recorded data. Unfinalized
thresholds, rewards and burn costs remain unconfigured or explicitly illustrative.
Detailed evaluations remain accessible without filling the main conversation
with administrative text.

## Boundaries and verification

No native token, live payouts, subscriptions, marketplace, leaderboards, startup
fund or animation work. Preserve demo/genuine isolation, self-review prevention,
private lineage and duplicate-award prevention. No per-profile chain calls solely
for decorative labels. Additive migrations and isolated fixtures preserve records
and audit history. Test exact-rank reads/direct URLs/actions, profile permissions,
author/delegate attribution, NFT tier continuity and desktop/mobile contribution
flow. Commit, update PROJECT_STATE and verification, provide a focused Chat 05
handoff. Do not deploy production.

## Implementation checklist

- [x] Add rank/room data and service-only permission boundaries.
- [x] Persist NFT tier separately from member standing and ownership epochs.
- [x] Connect reusable rooms, profiles and labeled delegation illustrations.
- [x] Preserve scoped finding/review/credit flow and actual personal progress.
- [x] Run security regressions, desktop/mobile journey and capture screenshots.
- [x] Record results/gaps, commit and hand off without production deployment.

Execution evidence and remaining live gaps are in the 2026-09-28 verification
entry. These completion marks do not mean live Silver transfer continuity or
the previously deferred Phase 1 checks were verified.
