# Launch member journey checkpoint (2026-10-05)

**Updated 2026-10-06:** the completion authority and walkthrough are in
[launch-completion.md](launch-completion.md). 027-028 and the separately approved
029 repair are applied with preservation/security checks. The isolated signed-in
review, award, correction/appeal and scheduled-monitor paths have now run. Approval
is not pending. The older classifications below describe the pre-activation
checkpoint, not current availability. No genuine reviewer was appointed.

Branch: `codex/category-alpha-review`. Review the local project at
`http://localhost:3000/`; this is not production. Preserve 023-026, genuine
records, the approved branding, top-right My Profile and exact-rank security.

## Implementation checklist

- [x] Version the specified launch limits, work awards, prediction terms and rank XP thresholds.
- [x] Keep nine category forms short, category/type first, with Unknown answers and optional prediction terms.
- [x] Add transactional local-schema tests for submission, review, signed XP, High reserves, caps, transfer continuity and preservation.
- [x] Add watchlist, scoped reviewer appointment, monitored-source queue, notification and daily runner boundaries.
- [x] Inspect public desktop/mobile Home, sample opportunities and Grind Intelligence.
- [x] Activate 027-028 on the shared database with explicit owner authorization and preservation assertions.
- [x] Run the isolated shared member, independent-review and scheduled-monitor journeys after activation; see completion evidence.
- [ ] Designate a genuine founder/steward and independently scoped reviewer through authorized administration.

## Historical pre-activation classification

| Area | Status at this checkpoint | Evidence or limit |
| --- | --- | --- |
| Existing Home, Hub, chat, exact-rank rooms, Profile, 026 alpha/Review Assistant | WORKING previously verified | Preserved; the new launch pass has not replayed the full live member journey. |
| Nine launch forms, daily new-alpha limit, work classification, signed prediction policy | BLOCKED for shared use | All nine saved through isolated PostgreSQL RPC tests; 027 is not shared-applied. Form submit is disabled until activation. |
| High reservation, weekly cap, update limit, enhanced approval, reversal, transfer continuity | BLOCKED for shared use | Transactional local tests pass; no genuine XP or NFT tier was changed. |
| Follow/participated, operator monitor queue, digest/reminder and notification boundaries | BLOCKED for shared use | 028 local tests pass. No configured live source job has run, and `CRON_SECRET` is absent locally. |
| Fictional Home opportunity cards | LABELED EXAMPLE | `/?sample=1` only; no partner, application, allocation or claim. |
| Coinbase price-outcome path | LIMITED LOCAL IMPLEMENTATION | Only BTC/ETH/SOL Coinbase Exchange spot, matching subject/asset/venue, UTC-hour expiry within seven days, complete hourly history. Intrahour ordering, other venues, derivatives, contracts and longer paths remain Inconclusive/unvalidated. |
| DEX Screener, DefiLlama, GoPlus, Solana, Robinhood and official-document source observations | WORKING previously verified with limitations | Read-only retrieval is not claim support; see `evidence-sources.md`. Unsupported identifiers remain Unknown. |
| Local Ollama reasoning | EXPERIMENTAL | Earlier isolated smoke cases ran; current member UI reports disconnected unless configured. No model may approve or award. No paid calls. |
| Genuine reviewer appointment and award | BLOCKED | Shared read-only check found zero genuine stewards and zero genuine reviewers/scopes. Do not appoint a demo reviewer over real work. |
| Upgrade execution, $GRIND claim, burns, payments, delegation economics | NOT IMPLEMENTED / INACTIVE | XP thresholds are recorded; no transaction or token economics are activated. |

## Shared migration and preservation

Migrations 026-029 are now shared-applied. Do not replay them on the shared
project. The reproducible 027-028-only transaction generator is
`pnpm exec tsx scripts/prepare-launch-migration.ts`; its ignored output is
`.local/launch-migrations.sql`. It checks 026, rejects an already-applied launch
schema, records every existing public table digest, runs both additive files in
one transaction, then asserts unchanged old rows, forced RLS, no browser RPC
grants and the new tables/functions. The same prepared transaction passed on a
populated isolated database and rejected a second run. Shared application was
subsequently approved and completed through the authenticated SQL editor; all
preservation assertions passed. Never replay 023-029.

Existing rank accounting has an execution conflict: `promotion_decisions` still
permits only Silver and `nft_tier_events` has one unique row per NFT, with the
trigger ignoring later conflicts. It cannot record a second tier advancement.
No contract or historical migration was changed. Upgrade execution remains
inactive until burn/transaction parameters and a separately authorized
upgrade-schema design are resolved. Historical promotions without launch XP
allocations are shown as provisional and cannot fund High reservations.

## Founder walkthrough after activation

1. Sign in at Home, verify the current NFT, enter Hub, open a category room and choose **Submit alpha**. The form stores the original author, UTC submission time, source message/version and evidence. An incomplete prediction can be shared, but is unvalidated and cannot earn outcome XP.
2. Open the saved receipt, then **Grind Intelligence** in the sidebar or **Explore in Grind Intelligence** on that alpha. Inspect source retrieval times, missing context, earlier permitted work and later observations. A failed source or model call does not erase the alpha.
3. An authorized same-rank, category-scoped reviewer who is not the author opens **Review Desk** and records an independent decision and work class. A genuine guide/analysis may earn work XP while a future prediction remains Pending. Without such a reviewer, the alpha stays pending.
4. Follow a permitted public opportunity or alpha, record off-platform participation if applicable, and inspect **My Profile** for watchlist, activity, signed XP and category history. Participation is a personal note, not proof of eligibility or registration.
5. After the original horizon, a reviewer records dated facts and evidence. A fast Coinbase spot call needs complete matching history; otherwise its outcome remains Inconclusive. A genuine long-term claim must not be backdated or shown as already successful.

The proposed recording route is Home -> Hub/category -> Submit alpha -> receipt
-> Grind Intelligence -> independent Review Desk/work XP -> Follow -> next action
or notification -> My Profile/history. The isolated route is now exercised;
genuine independent staffing is still needed for a real founder award. The
completion handoff distinguishes controlled records from genuine submissions.
Any accelerated isolated case must be visibly labeled as a walkthrough.

Public, sanitized captures: `launch-review/home-public-desktop.png`,
`sample-opportunities-desktop.png`, `sample-opportunities-mobile.png`,
`intelligence-public-desktop.png`, and `intelligence-public-mobile.png`.
These do not depict a signed-in launch member or prove the blocked journeys.
