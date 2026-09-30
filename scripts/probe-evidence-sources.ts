import { mkdir, writeFile } from "node:fs/promises";
import type { AlphaVersion } from "../src/alpha/model";
import {
  dexSource,
  llamaPriceSource,
  llamaProtocolSource,
  goPlusSource,
  solanaSource,
  optionalAccountSource,
} from "../src/server/alpha/public-sources";
import {
  marketSource,
  marketHistorySource,
  primaryDocument,
} from "../src/server/alpha/sources";

// Public well-known asset references only. Never reads member records or invokes a model.
const alpha: AlphaVersion = {
  version_id: "00000000-0000-4000-8000-000000000001",
  category: "Traders",
  contribution_type: "analysis",
  subject: "ETH",
  chain: "1",
  contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  details: {},
  purpose: "Public read-only provider probe",
  evidence: [],
  first_noticed: null,
  horizon: new Date(Date.now() - 86400000).toISOString(),
  check_condition: "No outcome is assessed",
  source_created_at: null,
  created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
};
const probes = [
  () => marketSource("ETH"),
  () => marketHistorySource(alpha),
  () => dexSource(alpha),
  () => llamaPriceSource(alpha),
  () => llamaPriceSource(alpha, true),
  () => goPlusSource(alpha),
  () =>
    llamaProtocolSource({
      ...alpha,
      evidence: [
        {
          kind: "link",
          value: "https://defillama.com/protocol/aave",
          label: "Explicit protocol reference",
        },
      ],
    })!,
  () =>
    solanaSource({
      ...alpha,
      chain: "Solana mainnet-beta",
      contract: "So11111111111111111111111111111111111111112",
    }),
  () =>
    primaryDocument(
      "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.md",
      "official-document",
    ),
  () => optionalAccountSource(alpha)!,
  () =>
    optionalAccountSource({
      ...alpha,
      chain: "Solana",
      contract: "So11111111111111111111111111111111111111112",
    })!,
];
const results = [];
for (const probe of probes) {
  const result = await probe();
  results.push(result.id === "official-document" ? {...result,facts:"Primary text omitted from the public report; source URL, retrieval time and digest retained."} : result);
  console.log(
    JSON.stringify({
      provider: result.label,
      status: result.status,
      checkedAt: result.checkedAt,
      ...(result.status === "unknown" ? { limitation: result.facts } : {}),
    }),
  );
}
await mkdir("docs/evidence-sources", { recursive: true });
await writeFile(
  "docs/evidence-sources/public-probes.json",
  JSON.stringify(
    {
      kind: "Public read-only probes, not claim verification",
      ranAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  ) + "\n",
);
