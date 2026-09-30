# Grind Intelligence checkpoint

Owner authorization: 2026-09-30. Same `codex/category-alpha-review` branch,
preserving annotations, top-right My Profile, genuine records and security.
No model calls, new reviewer roles, economics, merge or production deployment.

## Implementation

- `/intelligence` appears immediately below Submit alpha in the existing sidebar
  and responsive navigation. Home has a compact introduction and link.
- Uses the same live-membership-gated `readResearch` snapshot as alpha pages.
  Alpha selection is a GET form; direct inaccessible identifiers fail closed.
  Session-refresh proxy includes this route. No extra data store or model endpoint.
- Four native keyboard-accessible disclosure questions reuse Review Assistant
  sources, missing context, permission-filtered prior hints and AlphaOutcomes.
  Author, category, current version, server submission date and status are visible.
  Links connect the original alpha, Review Assistant and all-version history.
- Public visitors see only the introduction and membership gate. Sample research
  stays confined to the existing isolated accounts and has a visible sample notice.
- AI is explicitly disconnected. Retrieval is not factual support. Missing source
  dates, missing history and refresh unavailability remain visible. No made-up AI
  answers, scores, successful forecasts or XP. Claim $GRIND remains unchanged.

## Activation blocker

026 is approved but **not activated by this pass**. Supabase CLI `projects list`
reports no access token. App service credentials cannot execute migration SQL.
Read-only GET probes return PGRST205 for all five new tables and PGRST202 for
`alpha_category` and `alpha_submit_v2`. Existing alpha snapshot remains available;
the browser reports `evaluationAvailable=false`. A HEAD-only probe misleadingly
returned no error; this was rejected as insufficient and not used for activation.

Owner action: run `pnpm exec supabase login` locally and complete authentication.
Do not paste the token into chat. Then inspect actual SQL/catalog state; if pending,
execute the already prepared 026-only transaction with old-table digests, forced
RLS and browser-function-denial assertions. Roll back on any assertion failure.
Do not use ordinary db push (historical migration tracking remains unresolved),
reapply 023-025, or change roles to pass tests. No shared migration was attempted,
so no rollback or preservation-after-migration success is claimed.

## Founder walkthrough

Review http://localhost:3000/intelligence, not the older production site.
For existing work: Sign in -> Grind Intelligence -> select alpha -> Open alpha ->
expand one of the four questions. Only permitted rank/audience content appears.
Open alpha and Review Assistant links to its original version/history. My Profile
stays top-right; category history and Activity retain their existing links.

New genuine saving remains unavailable until activation. After activation and
the blocked write tests pass: Hub -> own-rank category -> Submit alpha -> category
and type -> required context (explicit Unknown is allowed) -> evidence, personal
addition and uncertainty -> Submit for review. A saved receipt links the alpha.
Source unavailability must not undo saving. Inspect it via Grind Intelligence;
authorized source refresh is in the source question. Genuine independent review
and genuine XP remain pending without designated scopes and an approved rule.
Neither this page nor source retrieval awards XP or proves a claim correct.

## Verification boundaries

See the latest `verification.md` entry for exact totals and browser evidence.
Shared save/retry, new source-refresh persistence, nine-category pending sharing,
correction/rejection/appeal and new independent outcome writes remain BLOCKED by
026. Local database regressions test these boundaries, not hosted activation.
Real AI, live Silver/transfer and historical Phase 1 checks remain unverified.
