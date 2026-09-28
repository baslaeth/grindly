# Grindly UI direction

Owner-authorized redesign of the existing six-screen application, 2026-09-25.
Branch: `codex/ui-specialist-workspace`, based on saved checkpoint `44dc11f`.
Local review: http://localhost:3000/join and http://localhost:3000/workbench.
**Not deployed.** Production stays on executable `a89e4d5`; no readiness claim.

## Decisions

- Charcoal navigation and brand surfaces; white research and form surfaces.
  Shared tokens live in `src/app/globals.css`. Fixed typography sizes, restrained
  borders, 4-6px control/tool radii, monochrome primary actions, semantic status
  accents. No theme switcher, invented statistics or trading-dashboard elements.
- Join leads with the approved exchange statement, an invitation anchor and an
  actual sign-in form. The public synthetic example and explainer are available
  without authentication. Membership buys neither expertise nor review powers.
- Workbench keeps the question, purpose, next action and specialty coverage
  together. Its default tab is the accepted evidence brief. Discussion,
  opportunities, records and specialists remain within this same screen.
  Tabs support arrow/Home/End keys. Four recent messages remain expanded;
  older messages are retained in a disclosure, with working deep links/replies.
- Icons and readable labels identify specialties independently of NFT rank.
  Demo labels remain visible. No client-side view grants new data access; all
  tab content comes from the existing permission-filtered server read.
- Finding entry groups the existing fields into claim, evidence/addition,
  time/lineage/permissions, and attributable submission. Corrections retain
  immutable history. Required markers do not change accessible field names;
  failed submissions keep current input. No draft persistence service was added.
- Review requires an explicit decision instead of preselecting acceptance.
  Scope, sources, limitations, conflicts and independent assessment remain
  mandatory. Record pages identify the next actor and show current evidence
  before prior versions, review history, usefulness and separately earned credit.
- Membership progress bars use existing ledger/policy values, capped visually
  at the prerequisite while showing actual totals. Human promotion stays
  separate. Silver's implemented benefit is peer-request initiation. Future
  tiers are not operational services; unfunded assignment status stays explicit.
- Same mobile `max-content 1fr` shell behavior; compact collapsed navigation.
  Reduced-motion CSS disables transitions/animation. No RPC calls or polling
  were added for presentation.
- Mobile menu hover retains its dark surface and visible white icon; contrast
  regression includes the hovered menu, not just default reading/action colors.

## Brand and explainer asset

- Original approved white vector: `public/brand/grindly/grindly-logo.svg`.
  Existing supplied file added unchanged as an application dependency. SHA-256:
  `12420f44f53be849da94f751e6ad1ad34c8395334a4d5addcd31f576e9b152ec`.
  It is used on dark surfaces, without filters or geometry changes. Other
  untracked brand exports and source files remain untouched.
- Higgsfield was searched in available/deferred tool metadata: no callable
  integration or Higgsfield skill was exposed. No external generation, upload,
  paid credits, account creation or subscription was used.
- Integrated fallback: `core-loop.tsx` (static poster, lazy loader, transcript)
  and `core-loop-motion.tsx` (React/HTML/CSS plus Lucide SVG icons and the original
  logo). This is one authored asset, not an external website or fabricated UI.
- Six scenes, three seconds each: fragmented specialist questions -> distinct
  attributed pieces -> connected evidence -> independent review and limits ->
  personal history/eligibility -> Silver peer request and the next question.
  Real HTML labels remain exact; no generated text or regenerated logo.
- Motion code loads only after Play. Eighteen-second playback stops, with no
  sound or automatic looping. Pause, replay and next-scene controls; background
  tab pauses; reduced-motion users advance static scenes manually. The static
  poster and full text transcript remain available without the motion module.
  No visitor-time Higgsfield/API dependency. No large video asset or new package.

## Review evidence

Screenshots: `docs/ui-review/before/{desktop,mobile}/` and
`docs/ui-review/after/{desktop,mobile}/`. Six routes plus accepted brief; after
also includes explainer, expanded history and the explicitly simulated form
error. The live journey adds the actual assigned synthetic review; foundation
tests supply short denied Workbench captures. Generated primarily by
`tests/live-research/ui-review.spec.ts` using only the
existing labeled QA identity. It refuses screenshots containing genuine
research and masks non-demo participant bylines. No cookies/OTPs are saved.

Desktop viewport 1280x720; mobile Pixel 7, 412x839 CSS pixels. Full-page
screenshots are intentionally longer than the viewport; Workbench/brief shots
show the initial viewport and accepted-evidence position. Device-pixel ratios
affect PNG dimensions. Before captures precede any presentation edits.

```powershell
$env:NODE_USE_SYSTEM_CA='1'
$env:GRINDLY_UI_REVIEW='1'
$env:GRINDLY_UI_PHASE='after'
pnpm exec playwright test --config playwright.research.config.ts ui-review
```

The protected review requires existing local services and isolated fixture
identities; it does not bypass authentication or live NFT ownership. Public
and denied-state coverage is in `tests/e2e/ui-explainer.spec.ts` and the existing
Chrome suite. See the latest `verification.md` entry for actual final totals.

## Unresolved, separate from design

Historical intermittent ownership/RPC availability remains unexplained
(diagnosis E). Phase 1 live B/C/D, genuine reviewer/steward staffing and human
research assessment remain incomplete as documented in PROJECT_STATE.
This redesign changes no server authorization, database policy, award rules,
contract, payment service or deployment. It is a local UI annotation checkpoint,
not evidence of production readiness or customer validation.
# 2026-09-28 Login and navigation annotations

The owner's 21 browser annotations remove the selected shell/Join eyebrow copy,
introductory paragraph, duplicate example/explainer labels, question and brief
paragraph. The remaining fictional-scenario label and testnet footer disclosure
stay visible. This is copy and navigation presentation, not a scope/access change.

- Labels: Login, Hub, Submit alpha, Review Desk, History, My profile. Route paths
  and backend concepts are unchanged; matching page titles use the same labels.
- Submit alpha uses the Lucide Send icon; My profile and the upper-right profile
  shortcut use CircleUserRound. No personal photo was supplied, so the shortcut
  is an honest generic avatar linking to the existing `/membership` screen.
- The sidebar footer shows separate unchanged Grindly and Robinhood Chain marks,
  not a combined partnership logo. The official white Robinhood Chain SVG was
  copied unchanged from the [official brand assets](https://docs.robinhood.com/chain/brand-guidelines/),
  downloaded from `https://cdn.robinhood.com/robinhood_chain/brand_assets/robinhood-chain-brand-assets-v1.zip`.
  Local asset: `public/brand/robinhood-chain-white.svg`; SHA-256
  `0ae4d1f6e2a933ba375c44527d17d7f81d419c2fce7e92a56cc8d3975612c584`.
- Next's supported `devIndicators: false` hides the development badge; runtime
  errors are not suppressed. No CSS shadow-DOM hiding or auth bypass.
- Screenshots: `docs/join-annotation-review/`; review http://localhost:3000/join.
  This annotation follow-up is local only, not pushed or deployed.
