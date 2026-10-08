# Pilot usability checkpoint - 2026-10-08

## Scope and decisions

Owner-authorized usability work and public release on the existing Grindly project.
No database migration, authentication policy, membership rule, reviewer appointment,
XP calculation, paid service or AI configuration changed.

Inspected Home, Login/onboarding, Hub and its ten rooms/five tabs, new and existing
alphas, all nine category forms and their expanded fields, Intelligence, Review
Desk, Profile, Following/monitoring/notifications and published XP rules. The
ordinary-member Review Desk is separately covered by a role-restricted render
test; signed-in live walkthroughs use isolated QA identities, not genuine members.

- Alpha previews expose title, author, sample/review status, finding and full main
  risk. Full records lead with the author's report, action steps and uncertainty.
  Unabridged evidence, older versions, attribution, decisions and credit remain.
- New posts offer Finding or analysis, Guide, Warning and Prediction. Analysis
  uses the existing find contract: no historical types are rewritten. Guides
  remain useful for reproducible steps; warnings retain a distinct cautionary
  intent. Updates and corrections are version actions, not new-post choices.
- Equivalent form questions share one answer. Distinct historical answers remain
  independently editable. Unknown and Not applicable remain explicit options.
  Optional context stays available, and predictions retain their separate rules.
- Official category URLs are added to evidence once. Optional chain/contract
  inputs are now retained where the form exposes them.
- Review Desk gives contributors their submissions and next action, reviewers
  their assigned work, and operators separate collapsed administration. Server
  permission checks, review independence and XP safeguards are unchanged.
- Intelligence separates source retrieval, timestamped saved experimental AI and
  human review. Source retrieval is never labeled claim proof. Model claims,
  quotations, limitations, source dates and technical diagnostics remain available.
- Rooms open on searchable/filterable alphas; Chat and existing deep links remain.
  Following has its own protected, session-refreshed route. Profile emphasizes
  rank progress and contributions; detailed accounting is available on demand.
- Semantic teal/blue/amber/red accents, icons, responsive layouts, saving/error
  feedback and concise sample labels replace repeated explanations. Login starts
  with the actual form; the illustrative explanation is optional.

## Category audit

Shared minimum: subject, useful finding/action, reason it matters, original work,
evidence, costs/risks and sharing permission. Existing evaluation contracts stay.

| Category | Category-specific essentials retained | Duplication removed |
| --- | --- | --- |
| Airdrop Hunters | Official source, author-reported facts, steps, network; prerequisites/speculation/testing available | Existing single project/cost/steps mapping retained |
| Whitelist Hunters | Official route, eligibility, action; deadline and route evidence available | Project, action and cost reuse shared answers |
| Presale Hunters | Official sale, terms, eligibility, deadline; valuation/vesting evidence available | Main downside reuses risk |
| Degens | Chain, contract, catalyst/disclosure; optional prediction terms | Prediction terms entered only once |
| Traders | Asset, venue, setup/instrument; optional prediction terms | Prediction terms entered only once |
| Project Analysts | Product, users/traction or explicit unknown, official evidence; independent check available | Decision reuses purpose; main risk reused |
| Seed and Early Stage Investors | Access, stage, public terms; team, lockup and milestones available | Opportunity reuses subject |
| NFT Specialists | Network, official contract/mint, entry cost; utility, supply, liquidity available | Collection reuses subject; downside reused |
| Meta Catchers | Affected projects and concrete early evidence; target, horizon and disproof available | Theme reuses subject; why-now reuses purpose |

## Verification

- `pnpm check`: lint, types, 263 unit tests, 309 database tests, database type drift,
  11 contract tests and production build passed. Applied migrations were not replayed.
- Foundation browser suite: 54 passed across desktop/mobile, including Following
  access boundary, navigation, overflow, keyboard/reduced-motion and auth safeguards.
- Focused signed-in pilot suite: desktop/mobile navigation through ten rooms and
  five tabs, all nine category forms, four new-post types, full record and saved
  Intelligence evidence passed. Save failures were intercepted with HTTP 503;
  payloads validated against the real schema and input retention was checked.
  These category exercises did not create nine new posts.
- One isolated sample guide was actually submitted through the normal UI:
  `75acf568-bb4c-48d3-8a24-82628f3772ac`, version
  `43a1a101-9a94-40fb-9af0-4de6becb016e`. The ignored local journal prevents
  repeated submissions. Pending status, Follow persistence after reload, five
  ranks and unchanged credit/decisions passed. Operations retains 125 sample XP.
- Follow-up revision exercise passed: existing values, Update/Correction options,
  valid version-linked payload and failed-save retention. The revision request
  was intercepted; no new version or reviewer decision was persisted.
- Existing reviewed sample `3e2e025f-45f3-418c-872e-8666248a8062` and previous
  recording guide were not edited. No fresh AI inference or review/award was run.
- Browser captures in [pilot-evidence](pilot-evidence/) are labeled isolated
  sample data. Desktop alpha, Intelligence, Profile, Review and Following plus
  mobile Home were visually inspected and prompted a further layout refinement.

## Remaining launch checks

- Genuine reviewer scopes still require owner-designated people. An isolated QA
  assignment does not staff the real review queue. Genuine work may remain pending.
- Existing-session and isolated helper authentication are not evidence of delivery
  to a genuine invitee's inbox, or their first wallet/membership issuance. Complete
  that authorized onboarding with the first real pilot participant before inviting
  a group; wallet approvals remain per-action.
- Public AI remains disconnected. Saved local experimental results and public
  source retrieval are separate capabilities, not fresh public inference.
- Local live checks experienced intermittent upstream latency; no access check
  was bypassed. Public release verification is recorded separately below.

## Release

Release uses `scripts/deploy-public.ps1`: committed source archive, existing
`basla1/grindly` project, existing environment and canonical `https://grindly.io`.
See the post-deployment entry for the deployed SHA, public checks and screenshots.

### Public verification

- Deployed `e23ab56810d2c7db6f44aa7fdcceee8bd3617c4a` using the existing release
  script. Vercel deployment `dpl_CZuKChr8Z1DkU9WNDuKL2FBXtbmN` is Ready;
  `https://grindly.io`, www and the existing Vercel aliases point to it. No
  production configuration or database changes were made.
- [Deployed-source CI](https://github.com/baslaeth/grindly/actions/runs/37773538597)
  completed successfully, including the foundation browser tests.
- HTTPS Home returned 200. A signed-out request to the new sample record did not
  expose its title and retained the membership boundary.
- Existing authenticated public session: Home -> Airdrop Hunters -> alpha search
  and status filter (including zero results) -> reviewed alpha -> Intelligence ->
  Profile -> Following/alerts -> Review Desk -> new Guide form all rendered.
  No new public save or review was submitted during this read-only release check.
- Profile displayed the unchanged 125 lifetime/progression sample XP, all five
  ranks, the new pending record and earlier accepted records. Review Desk showed
  pending/assigned and accepted states, with operator tools collapsed separately.
- Existing analysis remains saved at 2026-10-07 14:55:00 UTC; source-check run
  remains 14:29:55 UTC; independent sample decision remains 14:34:32 UTC. Expanded
  signing evidence retained its official quotation and its own source timestamp.
  Public fresh AI is disconnected, visibly and truthfully. No inference ran.
- Following retained the new guide. Its unconfigured monitoring status is explicit;
  following alone does not promise monitoring of arbitrary pages. Registered Axis
  monitoring showed last success 2026-10-08 05:32 UTC and hosted daily checks.
  The Starknet notification remains explicitly a historical 2024 sample replay.
- Public desktop captures were inspected for hierarchy and readable layouts.
  Mobile at 390x844 retained usable form controls without horizontal overflow;
  the final Home mobile layout and navigation were also checked.
- No public error state occurred in this walkthrough. Earlier local upstream
  latency is a residual reliability risk to observe during the small pilot, not
  evidence of a waived ownership check or guaranteed availability.
- [Screenshot gallery](pilot-evidence/README.md). All signed-in captures show
  isolated sample data, not genuine activity, independent human research or traction.
