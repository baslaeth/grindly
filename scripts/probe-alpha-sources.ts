import { mkdir, writeFile } from "node:fs/promises";
import {
  marketSource,
  marketHistorySource,
  primaryDocument,
} from "../src/server/alpha/sources";
const sources = [];
sources.push(await marketSource("ETH"));
sources.push(await marketHistorySource({ subject: "ETH", horizon: null }));
sources.push(
  await primaryDocument(
    "https://ethereum.org/en/developers/docs/",
    "primary-project",
  ),
);
sources.push(
  await primaryDocument("https://docs.chain.robinhood.com/", "primary-chain"),
);
sources.push(
  await primaryDocument(
    "https://docs.robinhood.com/chain/connecting/",
    "primary-connection-guide",
  ),
);
sources.push(
  await primaryDocument(
    "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.md",
    "primary-api-specification",
  ),
);
const report = {
  kind: "Public read-only source probes; no member material or model invocation",
  checkedAt: new Date().toISOString(),
  sources: sources.map(({ facts, ...source }) => ({
    ...source,
    observation:
      source.status === "retrieved"
        ? "Retrieved public source; not a claim assessment or forecast outcome."
        : facts,
    ...(source.id === "market-history" && source.status === "retrieved"
      ? {
          historyCoverage: {
            receivedBuckets: JSON.parse(facts).receivedBuckets,
            missingBuckets: JSON.parse(facts).missingBuckets,
          },
        }
      : {}),
  })),
};
await mkdir("docs/evaluation-foundation", { recursive: true });
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/alpha-source-probe.json",
  JSON.stringify(report, null, 2) + "\n",
);
await writeFile(
  "docs/evaluation-foundation/source-probes.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    sources.map((s) => ({
      id: s.id,
      status: s.status,
      checkedAt: s.checkedAt,
      publishedAt: s.publishedAt,
    })),
    null,
    2,
  ),
);
