# Grindly public hosting

Owner authorized deployment to their existing `grindly.io` domain on October 7,
2026. This supersedes earlier handoff prohibitions on production deployment for
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

Deployment identity, public browser evidence, monitoring results and CI will be
recorded here after the hosted walkthrough completes.
