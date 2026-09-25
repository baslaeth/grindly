# Research P0 operations

## Data and access

Apply migrations 007-010 in filename order after the six membership migrations.
The hosted instance uses the dashboard SQL editor; repair CLI migration history
as described in `runbook.md` before using `supabase db push`. Run
`scripts/verify-hosted-security.sql` as the database administrator afterward.
All 24 application tables have forced RLS and no browser grants. Internal RPCs
are service-role only. `/api/research` verifies the server session, current NFT
owner and ownership epoch on every request; POST also checks the exact origin.

The one shared question is seeded in `research_questions`. Discussion is visible
only behind that question's membership boundary. Finding permissions are either
all members or author plus authorized reviewers in the current version's specialty.
Submitted versions, messages, review decisions, usefulness and award rows are
append-only. Corrections retain original finding permissions and point to the
previous immutable version. Member-visible work cannot link restricted findings.
Snapshot filtering precedes brief assembly, profile selection and displayed counts.

## Reviewer and steward roster

There is no public role-granting endpoint. The owner must designate actual people
and their assessment scopes. A database operator records the corresponding
`member_roles` reviewer grant and `research_reviewer_scopes` row, with the real
grantor member ID and a nonempty scope, plus an `audit_events` grant record in one
transaction. A self-described specialty or NFT tier never creates these grants.
Stewards are separately designated in `member_roles`; do not reuse a retired QA
grant as a legitimate appointment. No genuine roster has been designated yet.

Submission assigns a configured independent reviewer in the finding's specialty.
An unstaffed scope remains visibly unassigned. A steward can retry assignment in
the Review Desk after the roster is configured. A decision rechecks the role,
scope, exact assigned version and independence inside the transaction. Reviewers
must record reasons, scope limits and a conflict-free declaration; conflicted
reviewers must not approve. Disputes exclude author, complainant and prior deciding
reviewers. If nobody independent is available, the dispute stays unresolved.

Acceptance updates status and inserts the initial award in the same locked
transaction. `award_ledger.finding_id` is unique, including after corrections or
across seasons. Accepted versions replaced by a pending correction leave the brief.
Earlier credit stays inspectable rather than pretending the earlier decision never
happened. A corrected/disputed assignment deliverable loses its currently accepted
work state; payment status never changes as a side effect of review.

## Demo policy and payment

`research_policy` contains operator-configurable demo defaults: 25 XP and 25
seasonal points per first accepted finding, season `P0-demo-2026`; Silver assessment
at 75 lifetime XP, three current member-visible accepted findings and one current
documented cross-specialty use. A different human steward must assess evidence in
`/review`; the server rechecks candidate ownership and the database binds approval
to that member/token/epoch. The existing metadata implementation reads it. Eligibility
is not automatic promotion. A current Silver member can post a scoped peer request.

The single assignment is explicitly an unfunded Grindly P0 demonstration, not a
real customer or an obligation to pay. Its illustrative fixed fee is 10 testnet
units, with no monetary value. Work and payment have independent database fields;
no payment, funding, escrow or automatic settlement endpoint exists.

## Verification fixtures

The public illustrative scenario in `src/research/illustration.ts` is fictional
and renders without exposing member records. Separately, live QA uses three clearly
labeled isolated Supabase identities at `grindly-qa-research-*@example.test`, with
real testnet NFTs and an operator-controlled `research_profiles.is_demo` label.
Their private test-wallet keys remain solely in ignored `.local/`. Demo reviewer
scopes cannot read restricted genuine work or decide genuine member findings.
Never reuse these credentials for real people or remove their demo labels.

Explicit provisioning (creates real testnet NFTs, never transfers user tokens):
```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm exec tsx --env-file=.env.local scripts/provision-research-fixtures.ts --apply-testnet-fixtures
```
This script is operator-only, not part of the app, and refuses unknown destinations
or non-46630 chains. It authenticates only the named fixtures via Supabase-generated
test OTPs through the normal verification route, proves their generated wallets and
uses the ordinary durable mint path. It is not real inbox-delivery evidence.
Rerunning reuses the local fixture journal; it never recreates missing keys.

The same isolated personas can populate a coherent, visibly labeled three-specialty
scenario using `pnpm exec tsx --env-file=.env.local scripts/seed-research-demo.ts
--apply-demo`. This operator-only seed creates synthetic messages, findings, reviews
and usefulness records. Its credit belongs only to QA identities. It is not evidence
of actual expert review, customer validation or real adoption. It is idempotent;
do not run it concurrently with tests that assert ledger changes.

With `pnpm dev` already running:
```powershell
$env:NODE_USE_SYSTEM_CA='1'
pnpm exec playwright test --config playwright.research.config.ts
```
Optional `RESEARCH_TEST_URL=https://grindly-woad.vercel.app` runs the same explicitly
labeled journey against the deployed build. Tests use separate fresh browser
contexts, not copied member sessions. Tracing is disabled to keep OTP/session
material out of artifacts. Screenshots contain labeled test records only.

The main `pnpm test:e2e` remains foundation-mode boundary coverage; it does not
pretend to verify the authenticated journey or satisfy deferred production auth,
promotion-invalidation or interrupted-chain-operation checks.
