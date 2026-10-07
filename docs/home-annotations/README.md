# Home annotation pass, October 7, 2026

Applied the owner's nine Home annotations after `738983e`:

- Removed the duplicate Grindly logo in the sidebar footer, preserving the main
  brand and Robinhood Chain link.
- Replaced the Airdrop Hunters bell with the existing Lucide package-open icon.
- Removed the three journey descriptions, Home sample-account banner, intro
  headline and shortcut row, and the Opportunities explanatory paragraph.
- Kept real navigation, My Profile, per-record sample labels, sample isolation,
  permissions and published XP rules unchanged. The separate sample route remains
  available at `/?sample=1`; tests no longer rely on the removed shortcut.

Local signed-in desktop/mobile Home and Airdrop room navigation were checked.
Foundation shell regressions check all removed elements and the replacement icon.
Screenshots show existing isolated sample records, not genuine member activity.

Verification: `pnpm check` passed (256 unit, 309 database, 11 contract tests,
type drift, lint/types and build); 18 desktop/mobile shell tests passed against
the completed build. An initial run started before the new build finished and
correctly detected stale Home markup; the fresh-build rerun passed. A transient
local ownership lookup recovered using the existing Refresh research action.
CI also exposed an older shell assertion requiring the now-removed footer logo;
that expectation was updated to require its absence while retaining the network
artwork check. The complete desktop/mobile suite then passed all 52 tests.

- [Desktop Home](desktop.jpg)
- [Mobile Home](mobile.jpg)
