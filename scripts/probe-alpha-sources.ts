import { marketSource, primaryDocument } from "../src/server/alpha/sources";
import { writeFile, mkdir } from "node:fs/promises";
const sources = [
  await marketSource("ETH"),
  await primaryDocument(
    "https://docs.robinhood.com/chain/connecting/",
    "primary",
  ),
];
const report = {
  checkedAt: new Date().toISOString(),
  results: sources.map((s) => ({
    label: s.label,
    url: s.url,
    status: s.status,
    checkedAt: s.checkedAt,
    publishedAt: s.publishedAt,
    digest: s.digest,
    excerptCharacters: s.facts.length,
  })),
};
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/alpha-source-probe.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
