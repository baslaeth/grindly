# Shared demo entry

Owner request, October 9, 2026: a reusable invitation lets multiple visitors
try the ordinary member experience with separate email-verified accounts.

`/join?mode=demo` accepts a shared code and sends an email OTP. Verified new
accounts receive a separate demo access grant and a sample Bronze profile,
without a wallet, NFT, reviewer role or XP award. Existing genuine accounts
must use Returning member; this flow never converts them to samples.

Visitors can read compatible sample records, submit in all nine Bronze
categories, chat, follow and edit their own profiles. Submission/review/XP
rules remain in the existing RPCs. Reviewer and operator roles are not granted.
Sample access does not issue or bind NFTs. Sample records stay separate from
genuine records through the existing compatibility checks. Revoking a demo
access grant stops that member's access; revoking a code stops new enrollment.
Codes are reusable until revoked, with a 60-second per-email cooldown, five
requests per email per hour and 100 requests per code per hour, in addition to
the email provider's limits.

Fresh AI inference remains disconnected in production. The local qwen3:4b
evaluation includes a false Supported result in the initial held-out run and
six unnecessary Unknowns in the final 42/48-label regression. Visitors can
inspect saved analysis with its original timestamps and refresh public source
checks. Source retrieval does not prove a claim; AI does not award XP.

## Release

Additive migration `202610090034_public_demo.sql` extends research access for
explicit sample grants. Migrations 001-033 are unchanged. Prepare the existing
table-digest/RLS/RPC-preservation transaction with:

```powershell
pnpm exec tsx scripts/prepare-demo-migration.ts
```

Apply `.local/demo-034.sql` once through the existing Supabase SQL editor after
tests. Create a reusable code with:

```powershell
pnpm exec tsx --env-file=.env.local scripts/create-demo-code.ts
```

The delivery text is written to ignored `.local/invitations/demo-ID.txt`.
Only a SHA-256 hash is stored in the database. Check Supabase SMTP delivery
for external email addresses before claiming public onboarding works.

Use the normal committed Git archive release workflow. Never publish local
invitation files, credentials or fixture sessions.

## Verification

034 was applied to `errbtterppmvtlfltgzp` on October 9, 2026. Its transaction
confirmed all pre-existing table digests were unchanged, forced RLS was enabled
and anonymous/authenticated browser roles had no public RPC execution grants.
Do not edit or replay 034. Supabase custom SMTP is enabled using the existing
Resend sender. Real inbox receipt is a separate check from isolated QA.
