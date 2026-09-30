# Free evidence and local reasoning checkpoint

2026-09-30, `codex/category-alpha-review`. Existing product, permissions and
annotation work are preserved. No deployment, paid calls, appointments or economics.

## Checklist

- [x] Activate owner-approved 026-only transaction and verify security/preservation.
- [x] Implement bounded free provider observations in existing saved source checks.
- [x] Add optional credential adapters and explicit local-only reasoning boundary.
- [x] Finish actual shared journeys, local inference experiment and responsive evidence.
- [x] Final local checks; remote push and CI identity are recorded in delivery.

## Database activation

The already-authenticated Supabase dashboard supplied authorized administration;
no login or approval renewal was needed. Preflight found source_checks and submit_v2
absent. The generated `.local/evaluation-migration.sql` (026 only) committed with
all pre-existing public-table digests unchanged, forced RLS and browser RPC denial
assertions passing. Postflight: both objects present, zero unprotected tables and
zero anon/authenticated RPC grants. No 023-025 edits/reapplications. A Monaco editor
postflight replacement initially left preceding SQL in the editor; the attempted
repeat stopped on existing alpha_category and rolled back. The editor was fully
cleared, rollback issued, and the read-only catalog check then passed. No second
migration committed. Proof: `screenshots/evidence-sources/migration-026*.jpg`.

This supersedes all previous pending-approval/authentication/026-not-applied notes.
Shared tests use existing labeled isolated identities only. Production executable
and genuine research/role/award records are unchanged.

## Coverage and identifiers

| Source | Implemented observation | Limits |
| --- | --- | --- |
| Coinbase Exchange | BTC-USD, ETH-USD, SOL-USD current ticker; 24-168 completed hourly candles, bounded around saved submission/horizon | One venue, USD price and base-asset volume; missing buckets explicit; no intrahour ordering, execution or automatic forecast result |
| DEX Screener | Exact chain/address, up to three matching base-token pairs; price USD, liquidity USD, rolling 24h volume USD, pair creation date | Ethereum/1, BSC/56, Polygon/137, Arbitrum/42161, Base/8453, Solana mainnet; quote-side token price is not misattributed; no complete historical data |
| DefiLlama prices | `coins.llama.fi` current and one past-horizon price for exact chain/address; observation timestamp/confidence | Future or absent horizons not queried; returned point must be within one hour; no reconstructed price path |
| DefiLlama protocol | `api.llama.fi/tvl/{slug}` from explicit `https://defillama.com/protocol/{slug}` evidence | Current aggregate TVL USD only; no inferred company match, funding, revenue, allocation or paid endpoint |
| GoPlus | Single-token unauthenticated EVM security response; allowlisted flags yes/no/Unknown | Coverage differs by chain/token; no flags or reported no are never safety guarantees; not a historical audit |
| Robinhood RPC | Existing chain46630, bytecode, bounded transaction receipts and block-consistency checks | Membership client/network unchanged; testnet only, no value or safety inference |
| Solana public RPC | Mainnet-beta or explicitly named devnet; finalized account and parsed mint; at most one matching explorer transaction link | Requires exact mint/account; devnet link must specify cluster=devnet; missing transaction/history Unknown; not membership or beneficial-owner proof |
| Official documents | Existing hosts plus solana.com, Uniswap developer docs, Aave docs/site, Ethereum blog, Optimism docs/site | HTTPS exact allowlist, no credentials/query/redirects; bounded 1MB body and 6500-character excerpt; publisher dates not independent verification; unsupported links preserved but not fetched |
| Alchemy (optional) | Ethereum receipt for one supplied EVM transaction with matching destination | Server-only ALCHEMY_API_KEY required; no account/plan created, currently unconfigured; no ownership-provenance inference |
| Helius (optional) | Mainnet DAS getAsset exact mint/interface/recorded owner | Server-only HELIUS_API_KEY required; currently unconfigured; no delegate/member rank access or transfer classification |

All categories retain category/type completeness and provenance checks. Traders
add Coinbase; token references in any category use supported token providers.
Project Analysts and Seed/Early Stage can reference explicit protocol TVL and
primary documents. Whitelist, Airdrop, Presale, NFT and Meta work can use official
announcements/guides/dates; no provider establishes eligibility, rewards, funding,
future success or safety merely by retrieval. Category evidence gaps remain visible.

Provider observations retain immutable alpha version via the source-run FK and
structured facts, network/asset, provider, sanitized reference, retrieval time,
observation time when supplied, units and limitations. Public JSON responses are
cached two minutes (100 entries), coalesced, at most12 requests/host/minute/process,
16 in flight, 7-second deadlines, bounded body, redirects rejected. No automatic
retry storm: zero automatic HTTP retries; explicit authorized refresh retries.
Existing SQL throttles refreshes. These process-local bounds are not a distributed
provider quota. Saving commits before asynchronous checks; an outage never undoes it.

## Reasoning and open source

Reviewed [GPT Researcher](https://github.com/assafelovic/gpt-researcher)
(Apache-2.0), [Vane](https://github.com/ItzCrazyKns/Vane) (MIT), and
[VeriScore](https://github.com/Yixiao-Song/VeriScore) (Apache-2.0). GPT Researcher
offers broad search/report orchestration; Vane adds a separate answering/search
stack. Neither is embedded as a second application or unrestricted research agent.
The focused approach reuses the project's maintained Zod, Cheerio and viem modules;
no new runtime dependencies or copied upstream code/prompts, so existing lockfile
and package notices remain intact. VeriScore's claim extraction -> evidence
retrieval -> verification separation informs the local instructions, without
importing its scoring or confusing missing evidence with contradiction.

Optional Ollama calls only `http://127.0.0.1:11434/api/chat`, with no tools,
redirects, cloud fallback or paid provider selection. `OLLAMA_MODEL` and explicit
`LOCAL_AI_APPROVAL=demo|all` are required. Source refresh NEVER calls a model.
The author/authorized assigned reviewer may explicitly request local preliminary
analysis. It uses existing immutable preliminary runs and the same rank/audience
guard; corrected versions receive separate runs. Failures save a truthful failed
state and allow retry. Findings validate strict schema, supplied source IDs,
exact excerpts/dates, evidence relationships and permitted prior IDs. Citation
validation does not establish semantic correctness: independent review is required.

Local instructions separate independently checkable claims, current observations,
future predictions, support, contradiction and Unknown. Source/member text is
untrusted data. No model can approve, award, transact or fetch arbitrary URLs.
Input/output sizes and a 45-second inference deadline are bounded. Tests of mocked
responses are implementation tests, not model accuracy. Promptfoo is not installed:
focused Vitest citation/injection/failure regressions and a real isolated local
experiment cover this boundary without introducing another provider/test service.

### Local runtime experiment

This machine has 32GB RAM and an RTX 3080 Ti with 12GB VRAM. Ollama v0.35.0 was
downloaded from its official release and its SHA256 verified before extraction.
The initial CPU-only run exceeded the existing 45-second deadline; the deadline
was not increased. An ASCII runtime directory fixed CUDA library discovery under
the Unicode project path. The local server then offloaded all 37 model layers.
`qwen3:4b` ran a real isolated document-grounding case in about 3.7 seconds: the
documented 300-candle limit was supported, an unsupported future ETH claim stayed
unverified, and an embedded request to award XP had no authority. The actual
result and public source digest are in `evidence-sources/local-model-probe.json`.
A second real run marked a false 500-candle limit contradicted by that document
while keeping the future price assertion unverified; see
`evidence-sources/local-model-contradiction.json`. These are isolated synthetic
evaluation inputs, not member research or live predictions.

Early invalid quotes, invented prior IDs and dates were rejected, not persisted
as successful analysis. The local structured-output boundary now constrains
evidence links to supplied dates/excerpts and permitted candidate IDs, followed
by normal application validation. One successful smoke case is not measured AI
accuracy, complete injection resistance, or verified paraphrase detection.

The first persisted market-card walkthrough also exposed reasoning limitations:
the model asked for historical data despite stored candle observations and
suggested a 24-hour follow-up not required by that non-prediction. Its bounded
input is incomplete and its recommendations can be poor. These are model output,
not application scheduling or an outcome decision; independent assessment remains
necessary. Exact citation validation is deliberately not advertised as an accuracy
guarantee. No model recommendation grants credit or changes a horizon.

The runtime, downloaded model, raw diagnostic response and environment file are
ignored local artifacts. Nothing requires a paid service. Local operation needs
the loopback Ollama process and explicitly configured model/approval scope; it
does not travel with a Git checkout or run on the unchanged hosted executable.

## Official references checked

- [Coinbase candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles)
- [DEX Screener API](https://docs.dexscreener.com/api/reference)
- [DefiLlama free docs](https://api-docs.defillama.com/llms-free.txt), [official SDK](https://github.com/DefiLlama/api-sdk)
- [GoPlus token security](https://docs.gopluslabs.io/reference/tokensecurityusingget_1)
- [Solana getAccountInfo](https://solana.com/docs/rpc/http/getaccountinfo), [getTransaction](https://solana.com/docs/rpc/http/gettransaction)
- [Helius getAsset](https://www.helius.dev/docs/api-reference/das/getasset)
- [Alchemy Ethereum receipt](https://www.alchemy.com/docs/node/ethereum/ethereum-api-endpoints/eth-get-transaction-receipt)
- [Ollama Windows](https://docs.ollama.com/windows), [chat API](https://docs.ollama.com/api/chat)

## Inspect an alpha

Local review: http://localhost:3000/ (not production). Sign in -> Hub -> own-rank
room -> Submit alpha -> category/type/context. Use Unknown where genuinely unknown;
provide your evidence/personal addition/limitations, then Submit for review. The
receipt links the immutable version. Open Grind Intelligence below Submit alpha,
select the alpha, Open alpha, then expand the four questions. Under sources open
"What was retrieved and its limits" for provider observations and dates. Refresh
sources is available to the author/authorized assigned reviewer. My Profile stays
top-right; its category history/Activity links initial decisions and later outcomes.

For a token reference use the explicit chain and contract/mint; ticker names alone
never select a token-risk target. For Coinbase use subject ETH, BTC or SOL. For
TVL add an explicit DefiLlama protocol URL. A public source, current price or local
model card is not approval, XP or successful outcome. Genuine reviewer scopes and
category XP rules remain owner decisions; claims/upgrades are inactive. Missing
historical evidence remains pending/inconclusive. No automatic outcome scheduler.

## Verification and classifications

- WORKING: approved 026 activation/preservation; all nine category saves with
  explicit Unknown; saved source runs; exact identifier/provider boundaries;
  Grind Intelligence navigation and question panels; independent review and
  immutable outcome infrastructure. Detailed current browser totals are in
  the latest verification entry, not inferred from unit tests.
- WORKING integration, EXPERIMENTAL reasoning: real loopback model calls and
  persisted cards, plus truthful failed-validation states. One in-app market
  card completed, and the final mobile run also completed; two similar requests
  were rejected as invalid_output.
  CLI document cases separately demonstrated supported/contradicted/unverified
  distinctions. Do not label failed requests as successful analysis or claim
  broad accuracy, semantic-copy detection or injection immunity.
- LABELED EXAMPLE: every shared-write/browser evaluation here uses existing
  isolated QA identities and synthetic contributions. The complete review/XP
  demonstration uses the existing demo award policy, not a genuine award rule.
  No model grants approval or credit.
- BLOCKED/unconfigured: live Alchemy and Helius calls without their optional
  server-only keys; genuine independent reviewer staffing and category XP rules
  still require explicit owner decisions. OpenAI remains unused/key deferred.
- NOT IMPLEMENTED/unverified: arbitrary asset/network coverage, comprehensive
  historical paths, automatic outcome scheduling, provider-based safety
  guarantees, full project revenue/funding datasets, live Silver/transfer checks.
  Solana account/mint reads were probed live; transaction matching and optional
  keyed adapters are covered with mocks, not represented as live verification.

The final public probe retrieved nine observations; both optional adapters
returned unconfigured. Approved document hosts do not guarantee each page works:
oversized, redirected, unavailable or unsupported pages stay Unknown. See the
source matrix above and timestamped `public-probes.json`.
