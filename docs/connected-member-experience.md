# Connected member experience: owner authorization, 2026-09-29

This brief supersedes conflicting room/navigation assumptions, not the frozen
product thesis. Work from annotation checkpoint `ce19a1f` on
`codex/connected-member-experience`. Preserve genuine records and unrelated assets.
Push the tested branch; no merge, force-push or production deployment.

Home is the public/main page with intentionally public opportunity cards. Hub
contains only the ten rooms of the acting member's live-verified exact NFT rank.
All five ranks are recognized: Bronze, Silver, Gold, Platinum, Diamond. Specialty
is not authority. No rank switch or fallback Bronze for unverified people.
My Profile stays top-right; history/activity live there. Review navigation is
restricted to authorized reviewers. Existing URLs and record links remain valid.

Use one compact persistent chat: text/links, replies, emojis, reactions, validated
private image/GIF uploads, retry-safe sends, per-account/per-room drafts cleared
on logout, incremental updates, older history, real read state, author edits and
deletes. Preserve immutable source versions for submitted/evaluated alpha.
Members/profiles remain discoverable with genuine-only counts and no fake presence.

Keep discussion -> alpha -> independent evaluation -> actual single XP award ->
profile/activity connected. Reuse existing award policy; do not create scoring or
appoint reviewers. Unstaffed work waits. Delegated authors and NFT owners stay
distinct; no new delegation/access/crediting flow or economics is authorized.

Show actual personal progress and a current/next NFT path. Unapproved thresholds
and burns say "To finalize"; Diamond has no next rank. Claim $GRIND is visible
but disabled: "Claims are not active yet." No invented balances or conversion.

Opportunity visibility and eligibility are separate. Per-card exact eligible
ranks plus other requirements govern server-checked participation, never implied
hierarchy. Supported actions: details, official link, registration/interest when
required, and claim only if real. No investments, allocation promises or task
marketplace. Reuse scoped operator authority. Public cards must omit restricted
links/codes/terms. Fictional cards and actions live only in a labeled sample area.

Isolate existing marked QA/demo records from genuine experiences without deleting
history. Preserve independent review, source privacy, duplicate-award protection,
demo boundaries and fail-closed live ownership. Shared hosted migrations must be
additive and backward-compatible. No new manual transfer verification.

## Checklist

- [x] Private chat/media, exact-rank and fixture boundaries; additive data.
- [x] Home/opportunities, navigation and compact live room conversations.
- [x] Source-version alpha, evaluation activity, truthful profile progression.
- [x] Isolated multi-session desktop/mobile browser and security verification.
- [x] Feature matrix below; final verification and push recorded separately.

## Feature status

WORKING means an actual end-to-end result in the stated environment, not a claim
of production readiness. All authenticated new browser evidence uses isolated QA
identities with existing Bronze testnet NFTs, never genuine member research.

| Requested capability | Status | Evidence / boundary |
| --- | --- | --- |
| Public Home, sign-in/Hub action, top-right My Profile | WORKING | Anonymous and authenticated desktop/mobile navigation. Normal Home has an honest empty state until a genuine opportunity is published. |
| Exact-rank room navigation and Members/profile return | WORKING | All ten Bronze rooms navigated in the browser; author and directory profile paths preserve the room. No rank selector or unverified Bronze fallback. |
| Other four rank spaces and cross-rank denial | LABELED EXAMPLE | Five-rank database fixtures exercise the same room guard and private APIs. Simulated Silver eligibility is not a live Silver NFT test. |
| Text, links, emoji, replies, persistent reactions | WORKING | Two independently authenticated QA accounts exchange and reload records; delivery occurs without a page reload. Chat creates no XP. |
| Private image and animated GIF messages | WORKING | Selection, paste, drop, previews, removal, attachment-only sends, persisted delivery and decoded two-frame GIF checked. Upload progress is wired; no fake GIF search. Size/type/ownership/private-source checks also have deterministic regressions. |
| Sending, drafts, reconnect, history and author controls | WORKING | Enter/Shift+Enter/IME; failed-response retry without a duplicate; per-room text and attachment draft recovery; logout clearing; offline reconnect; older history; edits and deletion. |
| Actual unread badges and empty conversation | WORKING | Persisted read-state tests plus browser unread/room navigation. Empty display is an explicitly simulated authorized API response; old QA messages were not deleted. |
| Alpha, independent correction/review, award and activity | WORKING | Desktop/mobile message action -> exact source -> pending -> independent correction -> new version -> actual assigned reviewer acceptance -> one existing-policy award -> matching My Profile and Activity. Unstaffed genuine work remains pending. |
| Immutable source text/media after edit/delete | WORKING | Full alpha source link is browser-tested; edit/delete preservation and private source-media access are database regressions. No version is rewritten. |
| Profile personal history and NFT progression | WORKING | Correct profile clicks and own actual QA ledger/activity; current/next tier shown, thresholds/burns say To finalize; Diamond has no next in deterministic coverage. |
| Genuine/delegated work attribution | BLOCKED | No genuine delegation records exist in this model. No fictional delegated credit is surfaced as genuine work. New delegate submission/access/accounting requires founder decisions. |
| Public fictional opportunity cards and interest | LABELED EXAMPLE | Separate `/?sample=1`; visitor visibility, Bronze eligible/ineligible actions and persisted sample interest verified. No real application, campaign link, claim, partnership or payment. |
| Existing-steward card management / extra requirements | BLOCKED | Implemented and database-tested, including stale requirement approvals, dates, exact ranks and demo boundaries. Live editor test skips because no isolated steward exists; none was appointed. |
| Real opportunities and official campaign actions | BLOCKED | No genuine campaign terms or protected URL supplied. Server eligibility and public-link redaction are tested; no external partner action was fabricated. |
| Claim $GRIND | NOT IMPLEMENTED | Visible disabled control and "Claims are not active yet." verified. No live claim flow found, balances invented, XP conversion or token deployment. |
| NFT upgrades, burns, delegate posting/crediting/splits | NOT IMPLEMENTED | Intentionally inactive. No approved thresholds/accounting rules or transactions introduced. |
| Private record isolation / sanitized member views | WORKING | Compatibility guard removes marked QA data before snapshots/counts/lineage; browser captures contain isolated accounts only. Forced-RLS and denied browser access remain tested. |

Operational limits and review targets: `QA05_CONNECTED_MEMBER_HANDOFF.md`.
Exact totals, earlier failed runs, screenshot paths and remote checkpoint:
2026-09-29 entry in `verification.md`.

Unresolved economics, claims, delegate submission/accounting and reviewer staffing
are not authorized by ecosystem context. This change does not establish production
readiness or replace deferred Phase 1 evidence.
