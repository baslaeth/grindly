# Grindly

One Next.js application, one Supabase project, and one transferable membership NFT on Robinhood Chain testnet (46630).

The authoritative scope is in `docs/frozen-p0.md`, `docs/frozen-technical-architecture.md`, and `docs/build-phase-1.md`. Actual verification results are in `docs/verification.md`.

See [the setup runbook](docs/runbook.md) for Supabase, SMTP, invitation creation, GitHub access, and the remaining live verification requirements. Phase 1 is not yet complete.

## Local development

Use Node 22.23.2 and pnpm 11.19.0. The supplied desktop pnpm runtime also uses compatible Node 24. Dependencies and the lockfile are pinned.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000/join. Foundation mode needs no external credentials. Copy `.env.example` to `.env.local` when configuring services; `.env.local` is ignored by Git. The environment is validated before the app starts or builds. Secrets are server-only and never prefixed `NEXT_PUBLIC_`.

On Windows networks whose certificate authority is in the Windows trust store, set `$env:NODE_USE_SYSTEM_CA = '1'` in PowerShell before installing. Do not disable TLS verification.

## Verification

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests start and stop their own production server on port 3100. Build first. To use an existing Chrome installation instead of downloading Chromium, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` (PowerShell: `$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'`). Screenshots and failure traces are written under ignored `test-results/`.

GitHub Actions runs lint, type checking, unit tests, build, and desktop/mobile browser tests. ESLint 9 is intentionally pinned because the React plugins in the chosen Next.js config do not yet support ESLint 10. `pnpm peers check` verifies compatibility.

## Database

Ordered migrations live in `supabase/migrations/`. Browser roles have no table privileges or RPC access; RLS is forced without browser policies. Server-only operations use Supabase's secret key. No database membership flag is sufficient to grant research access.

`pnpm test:db` applies the migrations to empty PGlite PostgreSQL instances and tests real SQL constraints and permissions. `tests/database/bootstrap.sql` supplies the Supabase roles and minimal `auth.users` table for those tests only; never apply it to Supabase.

`pnpm db:types` regenerates `src/types/database.ts` by inspecting the migrated PostgreSQL catalog. `pnpm db:types:check` fails when committed types drift from migrations. The test database is ephemeral and does not replace the Supabase project.

## Screen routes

| Route | Screen |
| --- | --- |
| `/join` | Join / Membership |
| `/workbench` | Research Workbench |
| `/submit` | Submit Finding |
| `/review` | Review Desk |
| `/contribution` | Contribution Record |
| `/membership` | My Membership |

`/` redirects to `/join`; it is not an additional product screen. The later research workflows are not implemented in Phase 1. No membership flag or sample data grants access.
