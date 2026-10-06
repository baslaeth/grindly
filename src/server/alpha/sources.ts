import "server-only";
import { createHash } from "node:crypto";
import { documentPassages } from "./document-passages";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { robinhoodTestnet } from "viem/chains";
import { getEnvironment } from "../environment";
import type { AlphaVersion, CheckedSource } from "@/alpha/model";
import { evidenceJson } from "./evidence-http";
import {
  dexSource,
  llamaPriceSource,
  llamaProtocolSource,
  goPlusSource,
  solanaSource,
  optionalAccountSource,
  evidenceAsset,
} from "./public-sources";

export const primaryHosts = new Set([
  "docs.chain.robinhood.com",
  "docs.robinhood.com",
  "ethereum.org",
  "docs.cdp.coinbase.com",
  "solana.com",
  "docs.uniswap.org",
  "developers.uniswap.org",
  "aave.com",
  "docs.aave.com",
  "blog.ethereum.org",
  "www.optimism.io",
  "docs.optimism.io",
  "optimism.io",
  "www.starknet.io",
  "docs.axisrobotics.ai",
]);
export function primaryUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.search &&
      !u.hash &&
      primaryHosts.has(u.hostname)
      ? u
      : null;
  } catch {
    return null;
  }
}
export async function boundedBody(response: Response, maximum = 250000) {
  if (!response.body) throw new Error("Missing body");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new Error("Source too large");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const unknown = (
  id: string,
  label: string,
  url: string | null,
  facts: string,
): CheckedSource => ({
  id,
  label,
  url,
  checkedAt: new Date().toISOString(),
  publishedAt: null,
  status: "unknown",
  facts,
  digest: null,
});
const documentCache = new Map<
  string,
  { until: number; source: CheckedSource }
>();
const documentPending = new Map<string, Promise<CheckedSource>>();
export function clearDocumentCache() {
  documentCache.clear();
  documentPending.clear();
}
export async function primaryDocument(
  value: string,
  id: string,
  focus = "",
): Promise<CheckedSource> {
  const url = primaryUrl(value);
  if (!url) return loadPrimaryDocument(value, id);
  const key = `${url.href}:${focus.slice(0, 500)}`;
  const saved = documentCache.get(key);
  if (saved && saved.until > Date.now()) return { ...saved.source, id };
  const pending = documentPending.get(key);
  if (pending) return { ...(await pending), id };
  if (documentPending.size >= 6)
    return unknown(
      id,
      "Primary document",
      url.href,
      "Unknown: source capacity is temporarily unavailable. Retry later.",
    );
  const job = loadPrimaryDocument(value, id, focus);
  documentPending.set(key, job);
  try {
    const source = await job;
    if (source.status === "retrieved") {
      if (documentCache.size >= 32)
        documentCache.delete(documentCache.keys().next().value!);
      documentCache.set(key, { source, until: Date.now() + 120000 });
    }
    return source;
  } finally {
    documentPending.delete(key);
  }
}
async function loadPrimaryDocument(
  value: string,
  id: string,
  focus = "",
): Promise<CheckedSource> {
  const url = primaryUrl(value);
  if (!url)
    return unknown(
      id,
      "Member-provided source",
      null,
      "Unknown: this URL is not in the supported primary-document allowlist. Not fetched.",
    );
  try {
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: {
        Accept: "text/html,text/plain",
        "User-Agent": "GrindlyEvidence/1.0",
      },
    });
    if (
      !r.ok ||
      !/^text\/(html|plain|markdown)/i.test(r.headers.get("content-type") ?? "")
    )
      throw new Error("Unavailable source");
    const raw = await boundedBody(r, 1000000);
    const { title, published, excerpt, passages, totalPassages, headings } =
      documentPassages(raw, focus);
    if (!excerpt) throw new Error("No text");
    const validDate =
      published &&
      Number.isFinite(Date.parse(published)) &&
      Date.parse(published) <= Date.now();
    const facts = JSON.stringify({
      title,
      headings,
      passages,
      totalPassages,
      excerpt,
      publicationDateProvenance: validDate
        ? "Publisher-supplied article:published_time; not independently verified."
        : "Unknown: absent, invalid or future publisher date.",
      limitations:
        "Primary source statements only, not independent confirmation of execution, eligibility or future rewards. At most 24 relevant passages / 14000 characters selected across a bounded 1 MB document, not exhaustive. Text may be stale. Claims still require assessment.",
    });
    return {
      id,
      label: title || url.hostname,
      url: url.href,
      checkedAt: new Date().toISOString(),
      publishedAt: validDate ? new Date(published).toISOString() : null,
      status: "retrieved",
      facts,
      digest: digest(raw),
    };
  } catch {
    return unknown(
      id,
      "Primary document",
      url.href,
      "Unknown: source retrieval unavailable, redirected, oversized or unsupported.",
    );
  }
}
const ticker = z.object({
  price: z.string().regex(/^\d+(\.\d+)?$/),
  bid: z.string().regex(/^\d+(\.\d+)?$/),
  ask: z.string().regex(/^\d+(\.\d+)?$/),
  volume: z.string().regex(/^\d+(\.\d+)?$/),
  time: z.iso.datetime({ offset: true }),
});
const marketPairs: Record<string, string> = {
  ETH: "ETH-USD",
  ETHEREUM: "ETH-USD",
  "ETH-USD": "ETH-USD",
  BTC: "BTC-USD",
  BITCOIN: "BTC-USD",
  "BTC-USD": "BTC-USD",
  SOL: "SOL-USD",
  "SOL-USD": "SOL-USD",
};
export async function marketSource(subject: string): Promise<CheckedSource> {
  const pair = marketPairs[subject.trim().toUpperCase()];
  if (!pair)
    return unknown(
      "market",
      "Market coverage",
      null,
      "Unknown: only BTC-USD, ETH-USD and SOL-USD spot ticker snapshots are supported. No historical outcome, price target or security conclusion follows.",
    );
  const url = `https://api.exchange.coinbase.com/products/${pair}/ticker`;
  try {
    const retrieved = await evidenceJson(url);
    const data = ticker.parse(retrieved.data);
    if (Math.abs(Date.now() - Date.parse(data.time)) > 15 * 60 * 1000)
      throw new Error("Stale ticker");
    const facts = JSON.stringify({
      market: pair,
      ...data,
      limitations:
        "Single-venue reference spot snapshot, not historical prediction verification, investment advice, liquidity depth or token security.",
    });
    return {
      id: "market",
      label: `Coinbase Exchange ${pair}`,
      url,
      checkedAt: retrieved.at,
      publishedAt: data.time,
      status: "retrieved",
      facts,
      digest: digest(facts),
    };
  } catch {
    return unknown(
      "market",
      `Coinbase Exchange ${pair}`,
      url,
      "Unknown: fresh market data unavailable.",
    );
  }
}
const candle = z
  .tuple([
    z.number().int().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
  ])
  .refine(
    ([, low, high, open, close]) =>
      low <= high &&
      open >= low &&
      open <= high &&
      close >= low &&
      close <= high,
  );
export async function marketHistorySource(
  alpha: Pick<AlphaVersion, "subject" | "horizon"> &
    Partial<Pick<AlphaVersion, "created_at">>,
): Promise<CheckedSource> {
  const pair = marketPairs[alpha.subject.trim().toUpperCase()];
  if (!pair)
    return unknown(
      "market-history",
      "Historical market coverage",
      null,
      "Unknown: historical observations support only BTC-USD, ETH-USD and SOL-USD. Other identifiers remain unverified references.",
    );
  const now = Date.now();
  const target =
    alpha.horizon && Date.parse(alpha.horizon) <= now
      ? Date.parse(alpha.horizon)
      : now;
  const end = Math.floor(target / 3600000) * 3600;
  const submitted = alpha.created_at
    ? Date.parse(alpha.created_at) / 1000
    : NaN;
  const hours = Number.isFinite(submitted)
    ? Math.min(168, Math.max(1, Math.ceil((end - submitted) / 3600)))
    : 24;
  const start = end - hours * 3600;
  const url = new URL(
    `https://api.exchange.coinbase.com/products/${pair}/candles`,
  );
  url.search = new URLSearchParams({
    granularity: "3600",
    start: new Date(start * 1000).toISOString(),
    end: new Date(end * 1000).toISOString(),
  }).toString();
  try {
    const response = await evidenceJson(url.href);
    const parsed = z.array(candle).max(300).parse(response.data);
    const candles = parsed
      .filter((c) => c[0] >= start && c[0] < end && c[0] % 3600 === 0)
      .sort((a, b) => a[0] - b[0]);
    if (
      !candles.length ||
      new Set(candles.map((c) => c[0])).size !== candles.length
    )
      throw new Error("Missing history");
    const facts = JSON.stringify({
      market: pair,
      bucketSeconds: 3600,
      start: new Date(start * 1000).toISOString(),
      endExclusive: new Date(end * 1000).toISOString(),
      expectedBuckets: hours,
      receivedBuckets: candles.length,
      missingBuckets: hours - candles.length,
      columns: ["bucketStartUnix", "low", "high", "open", "close", "volume"],
      candles,
      limitations:
        "One venue, up to 168 completed hourly buckets before the declared due horizon or retrieval hour. Longer periods and gaps remain Unknown. Prices are USD; volume is base asset. Buckets do not establish intrahour event order, execution or all-venue prices. Only a complete matched path can support an outcome decision.",
    });
    return {
      id: "market-history",
      label: `Coinbase Exchange ${pair} hourly observations`,
      url: url.href,
      checkedAt: response.at,
      publishedAt: null,
      status: "retrieved",
      facts,
      digest: digest(facts),
    };
  } catch {
    return unknown(
      "market-history",
      `Coinbase Exchange ${pair} hourly observations`,
      url.href,
      "Unknown: bounded historical data is unavailable or invalid. A current spot price cannot replace historical evidence.",
    );
  }
}
export async function chainSource(alpha: AlphaVersion): Promise<CheckedSource> {
  const transactions = alpha.evidence
    .filter((e) => e.kind === "transaction")
    .slice(0, 2);
  if (
    !["46630", "Robinhood Chain testnet"].includes(alpha.chain) ||
    (alpha.contract && !/^0x[0-9a-fA-F]{40}$/.test(alpha.contract))
  )
    return unknown(
      "chain",
      "Direct EVM RPC coverage",
      null,
      "Unknown: this direct EVM RPC check supports only Robinhood Chain testnet 46630. Other provider observations are listed separately; no mainnet security claim is verified here.",
    );
  try {
    // This bounded read-only evidence client is separate from membership verification.
    const url = getEnvironment().ROBINHOOD_RPC_URL;
    if (!url) throw new Error("Unconfigured");
    const client = createPublicClient({
      chain: robinhoodTestnet,
      transport: http(url, {
        retryCount: 0,
        timeout: 5000,
        fetchOptions: { signal: AbortSignal.timeout(12000) },
      }),
    });
    if ((await client.getChainId()) !== 46630) throw new Error("Wrong network");
    const block = await client.getBlock();
    const code = alpha.contract
      ? await client.getCode({
          address: alpha.contract as `0x${string}`,
          blockNumber: block.number,
        })
      : undefined;
    const receipts = [];
    for (const e of transactions) {
      try {
        const r = await client.getTransactionReceipt({
          hash: e.value as `0x${string}`,
        });
        receipts.push({
          hash: e.value,
          status: r.status,
          block: r.blockNumber.toString(),
          confirmed: r.blockNumber + 1n <= block.number,
        });
      } catch {
        receipts.push({ hash: e.value, status: "Unknown" });
      }
    }
    if (
      (await client.getBlock({ blockNumber: block.number })).hash !== block.hash
    )
      throw new Error("Inconsistent block");
    const facts = JSON.stringify({
      chain: 46630,
      block: block.number.toString(),
      blockHash: block.hash,
      contract: alpha.contract || null,
      hasBytecode: alpha.contract ? !!code && code !== "0x" : null,
      receipts,
      limitations:
        "Bytecode presence and receipt status only. Liquidity, holder concentration, ownership privileges, honeypot behavior and economic value are Unknown. Testnet assets have no monetary value.",
    });
    return {
      id: "chain",
      label: "Robinhood Chain testnet observation",
      url: `https://explorer.testnet.chain.robinhood.com/block/${block.number}`,
      checkedAt: new Date().toISOString(),
      publishedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
      status: "retrieved",
      facts,
      digest: digest(facts),
    };
  } catch {
    return unknown(
      "chain",
      "Robinhood Chain testnet",
      null,
      "Unknown: chain observation unavailable or inconsistent. No security conclusion made.",
    );
  }
}
export async function collectSources(alpha: AlphaVersion, guideFocus = "") {
  const result: CheckedSource[] = [];
  const links = alpha.evidence.filter((e) => e.kind === "link");
  const pair =
    alpha.category === "Traders"
      ? marketPairs[alpha.subject.trim().toUpperCase()]
      : null;
  const checks: Promise<CheckedSource>[] = links
    .slice(0, 3)
    .filter(
      (e) =>
        !pair ||
        e.value !== `https://api.exchange.coinbase.com/products/${pair}/ticker`,
    )
    .map((e, i) =>
      primaryDocument(
        e.value,
        `source-${i + 1}`,
        `${alpha.category} ${alpha.subject} ${guideFocus} ${JSON.stringify(alpha.details)}`,
      ),
    );
  if (links.length > 3)
    result.push(
      unknown(
        "more-sources",
        "Additional links",
        null,
        "Unknown: retrieval is bounded to three primary links per review. Additional submitted links remain available for human assessment.",
      ),
    );
  if (alpha.category === "Traders")
    checks.push(marketSource(alpha.subject), marketHistorySource(alpha));
  if (alpha.contract || alpha.evidence.some((e) => e.kind === "transaction"))
    checks.push(
      alpha.chain.toLowerCase().startsWith("solana")
        ? solanaSource(alpha)
        : chainSource(alpha),
    );
  if (evidenceAsset(alpha)) {
    checks.push(dexSource(alpha), llamaPriceSource(alpha), goPlusSource(alpha));
    if (alpha.horizon && Date.parse(alpha.horizon) <= Date.now())
      checks.push(llamaPriceSource(alpha, true));
    const optional = optionalAccountSource(alpha);
    if (optional) checks.push(optional);
  }
  const protocol = llamaProtocolSource(alpha);
  if (protocol) checks.push(protocol);
  result.push(...(await Promise.all(checks)));
  for (const [i, e] of alpha.evidence
    .filter((e) => e.kind === "attachment")
    .entries())
    result.push(
      unknown(
        `attachment-${i}`,
        e.label,
        null,
        "Member-provided image retained as evidence. Automated image interpretation is not enabled; human inspection required.",
      ),
    );
  return result;
}
