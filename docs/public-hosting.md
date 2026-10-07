# Grindly public hosting

Owner authorized deployment to their existing `grindly.io` domain on October 7, 2026. This supersedes earlier handoff prohibitions on production deployment for
this release. Product economics, shared records and membership rules are unchanged.

## Hosting and authentication

- Existing Vercel project: `basla1/grindly`, `prj_Bfam4j427T9FNcd7Lgd1Y0ND98Ad`.
- Canonical origin: `https://grindly.io`; `www` and the historical Vercel app
  alias redirect there. The contract's historical metadata URL remains reachable.
- Porkbun remains authoritative. Apex A records use Vercel's domain-specific
  recommendations `216.198.79.1` and `64.29.17.1`; `www` uses
  `ff61df29b05dba53.vercel-dns-017.com`. Existing mail records were preserved.
- Supabase project remains `errbtterppmvtlfltgzp`. Site URL is `https://grindly.io`;
  redirects allow this origin, the historical Vercel alias, and localhost ports
  3000 and 3001. No migration or data reset is needed for this release.
- Existing production membership, issuer and Supabase secrets remain server-only.
  `APP_URL` changed to the canonical origin; `CRON_SECRET` is a new random secret.
  `MONITORING_SCHEDULE=hosted-daily` describes the actual hosted schedule.
- Login uses six-digit email OTP, not a password. Returning members use Sign in ->
  Returning member with their original email. My Profile now shows only the
  current member's email. Test `.test` addresses have no real inbox; their isolated
  verification helper is not a public login or password-recovery facility.

## AI and monitoring

Ollama listens only on this development computer's loopback interface. Hosted
Vercel functions cannot reach it. The adapter explicitly stays unavailable on
Vercel, even if local settings were copied accidentally. No public tunnel, paid
model or cloud fallback was added. Existing saved preliminary cards keep their
original timestamps and remain viewable by permitted members. Public source
refreshes work independently of model inference.

`vercel.json` schedules `/api/monitor` daily at 05:00 UTC (09:00 Tbilisi). The
existing Hobby scheduler may invoke within that hour; this is not immediate
monitoring. The route uses a server-only bearer secret, bounded source batches
and a 300-second function limit. It checks only due registered sources. Events
still require existing operator confirmation; no new reviewer/operator is appointed.
Manual authenticated invocation verifies hosted execution, but does not prove
the next automatic scheduled invocation has occurred. Record those separately.

## Continue local development and publish

Local `.env.local` is preserved. Run `pnpm dev` for localhost:3000, or set
`APP_URL=http://localhost:3001` in the starting process and run
`pnpm dev --port 3001`. Local Ollama remains optional and separate from hosting.

Before publishing a new change: run `pnpm check` and the relevant browser checks,
commit on `codex/category-alpha-review`, then push. Run
`pwsh -File scripts/deploy-public.ps1` from this repository. It verifies the
linked project and deploys a Git archive of the committed source. Untracked
branding, local credentials, fixture journals and browser sessions are excluded.
It stops if the release directory already exists so a failed attempt can be
inspected before retrying. No force-push or merge is required.

GitHub pushes run CI; they do not currently publish automatically to Vercel.
Production environment changes require another deployment. Keep production
secrets in Vercel; never pull them over the local development environment.

## Verification record

- Deployed source: `eb67d32bcf692bf2997e017b6d13575e79cd2808` on
  `codex/category-alpha-review`; remote SHA verified. Deployment
  `dpl_5Jfx3r3twTWWReLQQdLBQTXD8zPK` is Ready and owns both domain aliases.
  Build URL: `https://grindly-qyrtwyfmk-basla1.vercel.app`.
- HTTPS Home returned 200. `www.grindly.io/xp` redirects to the canonical origin.
  The contract's existing `/api/metadata/46630/4` URL on the old Vercel alias
  redirects successfully and returns the token metadata. No contract changed.
- Desktop browser: fresh isolated email-code login, Bronze Hub, guide form,
  save, receipt reload, Grind Intelligence source refresh, Follow, updates and
  My Profile all completed on `grindly.io`. New sample alpha:
  `8e7f6463-3cf2-479d-8ad6-c65c34e94945`, saved at 12:50:42 UTC on October 7.
  Official Axis source retrieved at 12:50:48 and refreshed at 12:51:59 UTC.
  Version 1 remains pending, no new award; Profile shows the same record and
  two daily submissions remaining. Source retrieval is not claim verification.
- Existing isolated accepted work, 75 lifetime sample XP and the clearly labeled
  historical Starknet notification remained accessible. The notification was
  already Done: this release did not generate a new live claim announcement.
- One Profile request showed a transient protected research/ownership-check
  failure. A reload succeeded. No permission or ownership check was bypassed.
- Signed-out alpha fetch did not expose its title; anonymous monitor invocation
  returned 401. An authenticated hosted invocation returned 200 and persisted
  two due campaign retrievals (Starknet and Optimism), zero candidates/reminders.
  Their `last_success_at` values are 12:48:28 and 12:48:29 UTC respectively.
  Axis was not yet due; its separate guide source refresh succeeded.
- Vercel API confirms cron enabled, attached to this deployment, `/api/monitor`
  at `0 5 * * *`. The first automatic invocation of this new deployment has not
  yet occurred. The UI's per-source next check is its eligibility/due time;
  actual execution waits for the hosted daily invocation. No all-source or
  immediate-alert coverage is claimed.
- Localhost:3001 returned 200. Local Ollama was not listening during this release
  check. Its existing adapter/model configuration was preserved, but no new local
  inference was claimed. Hosted AI is explicitly disconnected, with no paid call.
- `pnpm check`: lint, types, 247 unit, 309 database, type drift, 11 contract tests
  and build passed. Foundation desktop/mobile E2E: 52 passed. These are separate
  from the signed-in hosted walkthrough and do not prove live inbox delivery or
  real founder research. [Deployed-source CI](https://github.com/baslaeth/grindly/actions/runs/37623195704)
  succeeded. [Public browser captures](public-hosting-evidence/README.md).

## Owner walkthrough and login

Open Home -> Sign in -> Returning member. Use the original member email and the
code delivered to that inbox, then open Hub -> Airdrop Hunters -> Submit alpha.
Select Guide, enter the official link and clearly distinguish documented facts
from personal testing. Save -> Inspect evidence in Grind Intelligence -> What
sources were checked? -> Refresh sources. Return to the alpha and Follow it.
My Profile (top-right) contains Following, Important airdrop updates, Activity and
contribution history. Genuine unstaffed work stays Pending; the new hosted sample
did not create a reviewer, award or forecast outcome.

The Codex browser was signed into `grindly-qa-research-operations@example.test`,
an isolated account without a real inbox, not an identified founder login. There
is no Grindly password to reset. The owner was asked which personal email they
want to use; do not infer it from unrelated service sessions or create a genuine
session using the isolated helper. No personal email reply was received during
this verification.
