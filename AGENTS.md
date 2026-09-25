<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Grindly Handoff

Read these before changing scope or implementation:
- `docs/frozen-p0.md`: approved product scope.
- `docs/frozen-technical-architecture.md`: supplied architecture and source-completeness warning. Missing approved sections must not be invented.
- `docs/build-phase-1.md`: approved Phase 1 acceptance checklist.
- `docs/PROJECT_STATE.md`: current checkpoint and blockers.
- `docs/verification.md`: chronological evidence; distinguish live, simulated, user-reported, and untested results.
- `docs/runbook.md`: setup, service configuration and operations.

The 2026-09-25 owner authorization permits the research collaboration journey;
see `docs/research-scope.md`. Stop at its QA/UI-annotation checkpoint. Phase 1
still has explicitly deferred live checks; do not call it fully verified.
Use only Robinhood Chain testnet (46630). Ask for wallet approvals one exact action
at a time. Never request private keys, copy browser sessions, or manufacture live
promotion evidence. Empty/unimplemented histories do not prove preservation.

Commands (pnpm 11.19.0, compatible Node per package.json):
- `pnpm install --frozen-lockfile`
- `pnpm check`: lint, typecheck, unit, database, database type drift, contract tests, build.
- `pnpm test:e2e`: foundation-mode browser tests on port 3100; not live OTP/NFT evidence.
- `pnpm dev`: local app, normally http://localhost:3000/join.

Windows: set `$env:NODE_USE_SYSTEM_CA='1'` for Node network requests, retaining TLS
verification. Set `$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'` to use installed Chrome
for E2E, or install bundled Chromium with `pnpm exec playwright install chromium`.
Keep `.env.local`, `.local/`, and transaction/signature secrets uncommitted. Preserve
unrelated user changes, including untracked `docs/brand/` and `public/`.
