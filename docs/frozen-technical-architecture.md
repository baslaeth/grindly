# FROZEN TECHNICAL ARCHITECTURE

Build Grindly as **one Next.js application, one Supabase project, and one transferable ERC-721 contract on Robinhood Chain testnet**.

The frozen P0 remains authoritative. There are six screens; returning to Workbench completes the journey. This is an implementation specification, not an application implementation.

### 1. Stack decisions

| Area | Decision |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend | Next.js Node.js server routes and server-side service modules |
| Database | Supabase Postgres; SQL migrations and generated TypeScript database types |
| Authentication | Supabase email OTP |
| Wallet | Injected EVM wallet through wagmi; viem for signatures, reads, and transactions |
| Contract | Solidity, OpenZeppelin ERC-721, Hardhat |
| Hosting | Vercel for the app; Supabase for database/auth |
| Testing | Vitest, database integration tests, Hardhat contract tests, Playwright |
| Package management | pnpm; commit lockfile and pin compatible dependencies during scaffolding |

Use Server Components for initial reads and Client Components for forms and wallet interactions. Keep business rules in server modules rather than page components. Next.js documents server-side authentication patterns, and Supabase provides an official Next.js integration. [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Supabase Next.js guide](https://supabase.com/docs/guides/auth/quickstarts/nextjs)

No separate API deployment, ORM, queue service, search engine, indexer, or LLM is required for P0.
