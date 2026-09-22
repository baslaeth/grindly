# BUILD PHASE 1 - EXACT FIRST IMPLEMENTATION TASKS

**Phase 1 outcome:** an invited person can authenticate, prove wallet ownership, mint or bind a real testnet NFT, enter the protected Workbench shell, and lose that access after transferring the NFT.

The other five screen routes exist, but their later workflows are not implemented yet.

1. Save the supplied frozen scope and architecture under `docs/`. Scaffold Next.js, TypeScript, Tailwind, pnpm, lint/type checking and environment validation.
   - Acceptance: app builds; all six routes render; no extra product screen appears.
2. Configure CI for lint, type checking, unit tests and build. Add contract/database checks as those packages land.
   - Acceptance: first foundation commit passes CI.
3. Create Supabase migrations for members, invitations, wallet challenges/bindings, roles, membership bindings, chain operations, promotion decisions and audit events. Add uniqueness constraints and revoke browser data access.
   - Acceptance: migrations apply to an empty database; direct anonymous/authenticated table access is denied.
4. Implement invitation redemption and email OTP inside `/join`. Configure SMTP and session handling.
   - Acceptance: invited email can join; expired/reused/wrong-email invitations fail; authentication alone grants no research access.
5. Implement wallet challenge issuance and verification. Derive member identity from the server session.
   - Acceptance: correct signature binds the wallet; replay, expiry, wrong domain, wrong chain and another member's challenge fail.
6. Implement `GrindlyMembership` with issuer-only, idempotent minting, standard transfers, ownership epochs and stable metadata URLs.
   - Acceptance: contract tests pass, including duplicate issuance and transfer-away-and-back.
7. Deploy the app shell, then deploy and verify the contract on Robinhood Chain testnet. Commit the deployment manifest and ABI.
   - Acceptance: explorer shows verified source; app and RPC agree on chain `46630`; deployment address is recorded.
8. Implement durable mint operations: create operation, serialize nonce allocation, persist signed transaction, broadcast, reconcile receipt/event, bind token. Also implement binding an existing owned token by token ID.
   - Acceptance: Join issues a real NFT; retries produce one token; pending/reverted transactions never grant access.
9. Implement `requireActiveMembership()` and use it on the Workbench server read and a protected test mutation. Read ownership and epoch at one chain block.
   - Acceptance: current owner succeeds; former owner fails after transfer; RPC failure returns a retryable error.
10. Implement the metadata endpoint and My Membership foundation. Return Bronze unless a valid steward-approved member/token/epoch promotion exists.
    - Acceptance: metadata exposes no personal data; token address/ID and mint transaction link to the explorer.
11. Test transfer between two independently authenticated members.
    - Acceptance: recipient can bind; sender loses research access; member IDs and histories remain separate; stale promotion bindings cannot apply.
12. Write the setup/runbook and record actual verification results.
    - Acceptance: fresh checkout can run from documented steps; live testnet mint/bind/transfer evidence is recorded without secrets.

Suggested commit boundaries:
foundation -> schema/security -> invitation/auth -> wallet proof -> contract/tests -> deployment manifest -> issuance/binding -> access/transfer verification.

Phase 1 is complete only when the real NFT controls access correctly.

Static wallet badges, mocked ownership, and database-only membership flags do not satisfy that milestone.
