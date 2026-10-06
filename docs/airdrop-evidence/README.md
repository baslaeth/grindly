# Airdrop evidence and local-model evaluation

2026-10-06, `qwen3:4b`, Ollama 0.35.0, existing local RTX 3080 Ti / 32 GB RAM.
No paid API, OpenAI call or cloud fallback. This is an internally authored, narrow
two-document evaluation, not independently established market accuracy.

## Actual runs

| Run | Correct primary labels | False Supported | False Contradicted | Unnecessary Unknown | Invalid/failed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial development | 13/20 | 0 | 1 | 6 | 0 |
| Refined development | 19/20 | 0 | 1 | 0 | 0 |
| Held out once after instruction freeze | 9/10 | 1 | 0 | 0 | 0 |

Expected results and source-based reasons were recorded before invocation in the
expectations files. Initial retrieval selected an irrelevant terms dialog on the
Optimism page; main-content selection and bounded relevant passages fixed that.
The held-out set was not rerun to improve its result. Frozen instruction hash:
`233f1cb78a509ea8fff8fcf874c1f7f71c82832dbf5b27c2561f676c783c8725`.

The primary-label totals do NOT mean all explanations were correct:
- Development d09 falsely contradicted a claimed 1000-STRK deposit: portal fee
  coverage does not by itself establish absence of a deposit requirement.
- Held-out h09 falsely supported present portal operation from a historical
  announcement. This missed a material current-versus-historical problem.
- Manual summary audit found wrong/unsupported date statements in **8/20** refined
  development cases (d01,d03,d04,d05,d07,d09,d10,d14) and **3/10** held-out cases
  (h02,h03,h05). Examples: launch/publication treated as discontinuation, four
  months calculated incorrectly, snapshot treated as publication date.
- h05 also invented that a particular claimant did not meet eligibility; d08
  overgeneralized the closed program to no current Starknet airdrop. These are
  not established by the supplied documents.
- Citation IDs, exact excerpt membership and supplied source-date fields passed
  schema validation in all 30 final atomic cases. This does NOT validate semantic
  relevance, dates invented in prose, or the conclusion drawn from a quotation.
- Recorded per-case response times are in the JSON files (roughly 1.6-5.1 seconds
  for final atomic cases; cold initial calls were slower). No failures were hidden.
- Source-instruction injection cases did not change awards, permissions or expose
  private records. The model has no award/write/transaction tool in this path.

## Whole-guide browser runs

The atomic set does not establish full-category or long-guide accuracy. Browser
testing subsequently found that free-form claim extraction could omit the guide's
unsupported guarantee. The full-guide path now supplies a bounded explicit claim
list and rejects missing/replaced claim entries. All saved category context is
sent, not just its legacy conversion. This later change was exercised on two
actual saved guides, not on a fresh untouched statistical test set.

Starknet v2: persisted local result at 12:42:06 UTC. Historical wallet/fee steps
Supported, deliberately universal future guarantee Unknown. It still overstated
support for the contributor's self-reported document reading and made an overly
broad current-rewards statement. The separate reviewer requested correction and
awarded zero XP. Optimism: persisted local result at 12:51:05 UTC; snapshot/future
eligibility warning Supported, current costs Unknown; self-report support is still
too strong. Reviewer awarded only 50 isolated work XP for the sourced warning.

Earlier saved attempts remain in history: a tuple JSON-schema shape rejected by
Ollama (fixed to constrained arrays), then invalid output, then a successful retry.
No model failure erased a submission or awarded XP. This checkpoint improves
input coverage and usability, not an assertion of reliable AI expertise.

## Monitoring proof

Live official pages were retrieved by the actual local scheduled worker around
12:24 UTC. The first observation was a baseline, not an announcement. Later worker
ticks at 12:40 and 12:55 completed with no due sources. Campaign rows retain the
last successful check and next due date; the browser displays both.

No new live material announcement occurred. `monitoring-replay.json` identifies
the isolated replay of a genuine official 2024 opening passage. An existing test
operator confirmed it in Review Desk; the existing author received it, acknowledged
it, then marked Done. The displayed scheduled opening is in 2024 and observed
availability is Unknown. No genuine follower received the controlled event.

Database tests additionally cover two same-campaign guides, one notification per
member, paused preferences, denied cross-rank following/read/action, duplicate
confirmation, and retained acknowledgment/completion. Unit tests cover cosmetic
updates, repeated announcements, changed deadlines, future openings, negated
availability, and captured official opening wording.

## Screenshot index

All signed-in captures show **isolated controlled accounts/records**, not founder
research, customer activity or live NFT proof. The form captures show the current
prefilled correction form, without creating an additional submission. Receipt v2
shows its historical save and the later Needs correction decision separately.

| View | Desktop | Mobile |
| --- | --- | --- |
| Form | [desktop](screenshots/form-desktop.png) | [mobile](screenshots/form-mobile.png) |
| Receipt | [desktop](screenshots/receipt-desktop.png) | [mobile](screenshots/receipt-mobile.png) |
| Grind Intelligence | [desktop](screenshots/intelligence-desktop.png) | [mobile](screenshots/intelligence-mobile.png) |
| Following | [desktop](screenshots/following-desktop.png) | [mobile](screenshots/following-mobile.png) |
| Historical replay notification | [desktop](screenshots/notification-desktop.png) | [mobile](screenshots/notification-mobile.png) |
| XP guide (published rules) | [desktop](screenshots/xp-desktop.png) | [mobile](screenshots/xp-mobile.png) |
| Profile progression | [desktop](screenshots/profile-desktop.png) | [mobile](screenshots/profile-mobile.png) |

[Mobile navigation](screenshots/navigation-mobile.png) keeps Grind Intelligence
below Submit alpha and My Profile top-right.
[Mobile reward cards](screenshots/xp-rewards-mobile.png) and
[mobile rank table](screenshots/xp-ranks-mobile.png) show the expanded reading route.
[Accepted guide history](screenshots/accepted-history-desktop.png) shows the
separate isolated review and actual 50-XP award.
[Unavailable source](screenshots/source-unavailable-desktop.png) preserves the save.

No session, OTP, API key, raw database export or genuine private submission is
included. Full retrieval snapshots and private test journals remain ignored;
saved source checks preserve the reviewed excerpts for permitted viewers.
