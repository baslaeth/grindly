import "server-only";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { robinhoodTestnet } from "viem/chains";
import { getEnvironment } from "../environment";
import type { AlphaVersion, CheckedSource } from "@/alpha/model";

export const primaryHosts = new Set([
  "docs.chain.robinhood.com",
  "docs.robinhood.com",
  "ethereum.org",
  "docs.cdp.coinbase.com",
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
export async function primaryDocument(
  value: string,
  id: string,
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
      !/^text\/(html|plain)/i.test(r.headers.get("content-type") ?? "")
    )
      throw new Error("Unavailable source");
    const raw = await boundedBody(r);
    const $ = load(raw);
    const published = $("meta[property='article:published_time']").attr(
      "content",
    );
    $("script,style,nav,header,footer,form,button,noscript,svg").remove();
    const root = $("main").length ? $("main") : $("body");
    const facts = root.text().replace(/\s+/g, " ").trim().slice(0, 6500);
    if (!facts) throw new Error("No text");
    return {
      id,
      label: $("title").text().slice(0, 120) || url.hostname,
      url: url.href,
      checkedAt: new Date().toISOString(),
      publishedAt:
        published && Number.isFinite(Date.parse(published))
          ? new Date(published).toISOString()
          : null,
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
export async function marketSource(subject: string): Promise<CheckedSource> {
  const product: Record<string, string> = {
    ETH: "ETH-USD",
    ETHEREUM: "ETH-USD",
    "ETH-USD": "ETH-USD",
    BTC: "BTC-USD",
    BITCOIN: "BTC-USD",
    "BTC-USD": "BTC-USD",
  };
  const pair = product[subject.trim().toUpperCase()];
  if (!pair)
    return unknown(
      "market",
      "Market coverage",
      null,
      "Unknown: only BTC-USD and ETH-USD spot ticker snapshots are supported. No historical outcome, price target or security conclusion follows.",
    );
  const url = `https://api.exchange.coinbase.com/products/${pair}/ticker`;
  try {
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error("Provider unavailable");
    const data = ticker.parse(JSON.parse(await boundedBody(r, 16000)));
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
      checkedAt: new Date().toISOString(),
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
export async function chainSource(alpha: AlphaVersion): Promise<CheckedSource> {
  const transactions = alpha.evidence
    .filter((e) => e.kind === "transaction")
    .slice(0, 2);
  if (!["46630", "Robinhood Chain testnet"].includes(alpha.chain))
    return unknown(
      "chain",
      "Chain coverage",
      null,
      "Unknown: only Robinhood Chain testnet 46630 is supported. No mainnet security claims are verified.",
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
export async function collectSources(alpha: AlphaVersion) {
  const result: CheckedSource[] = [];
  const links = alpha.evidence.filter((e) => e.kind === "link");
  const checks: Promise<CheckedSource>[] = links
    .slice(0, 3)
    .map((e, i) => primaryDocument(e.value, `source-${i + 1}`));
  if (links.length > 3)
    result.push(
      unknown(
        "more-sources",
        "Additional links",
        null,
        "Unknown: retrieval is bounded to three primary links per review. Additional submitted links remain available for human assessment.",
      ),
    );
  if (alpha.category === "Traders") checks.push(marketSource(alpha.subject));
  if (alpha.contract || alpha.evidence.some((e) => e.kind === "transaction"))
    checks.push(chainSource(alpha));
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
