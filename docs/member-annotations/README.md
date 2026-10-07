# Member-page annotations, October 7, 2026

Applies the owner's fourteen annotations after `e3d9b77`:

- Sign out now precedes Robinhood Chain, superseding the earlier ordering.
- Removed account banners on submission, Intelligence, Review Desk and Profile.
  Record-level sample labels and the saved-alpha account notice remain.
- Removed the submission explanation sidebar; the form uses one column.
- Removed the signed-in Intelligence introductory paragraph. Public introduction
  and per-record source/model status remain truthful and unchanged.
- Removed Profile's display-name/focus heading and Submit alpha shortcut, keeping
  Edit profile, recorded identity, history and accounting.
- Removed repeated room captions and the rank-utility paragraph. Five rank badges,
  current-rank marker, progress and approved thresholds remain.

No data, permissions, XP policy, claim or upgrade behavior changed.
Screenshots show existing isolated sample records.

Verification: signed-in browser inspection of all four pages and 390px Profile;
no horizontal overflow. `pnpm check` passed (258 unit, 309 database, 11 contract
tests, lint/types, drift and build); all 52 desktop/mobile browser tests passed.
Tests retain the current-rank marker and verify the revised sign-out ordering.

- [Profile desktop](profile-desktop.jpg)
- [Profile mobile](profile-mobile.jpg)
- [Submission](submission.jpg)
- [Intelligence](intelligence.jpg)
- [Review Desk](review.jpg)
