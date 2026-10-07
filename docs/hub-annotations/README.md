# Hub annotations, October 7, 2026

Applies the six owner annotations after `6cfbf0d`:

- Removes the global testnet footer (transaction-specific information unchanged).
- Removes the Hub specialty note, rank-space eyebrow and account banner only.
- Uses Lucide Share2 for the sidebar Submit alpha action.
- Moves the existing sign-out behavior below Robinhood Chain. The mobile menu
  reveals the network link and sign-out together; collapsed navigation hides both.

No data, membership authorization, XP rules or per-message sample labels changed.
The logout request and draft-clearing behavior are unchanged. Screenshots use
existing isolated sample accounts.

Verification: `pnpm check` passed (258 unit, 309 database, 11 contract tests,
lint/types, drift and build). Rebuilt after the final CSS adjustment; all 52
desktop/mobile browser tests passed. Signed-in browser inspection confirmed ten
Bronze rooms, no marked Hub labels/footer, and exactly one sign-out below the
network link. Mobile menu open/close hides and reveals it without overflow.

- [Desktop](desktop.jpg)
- [Mobile menu](mobile.jpg)
