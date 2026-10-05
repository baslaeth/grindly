import type { CheckedSource } from "@/alpha/model";
import { settlePricePath } from "./policy";

type Terms = { direction?: string; entry?: string; stop?: string; target?: string };
type MarketContext = { asset?: string; venue?: string; instrument?: string };

export function supportsCoinbaseSpot(subject: string, context: MarketContext, category: string) {
  return category === "Traders" && context.asset?.trim().toUpperCase() === subject.trim().toUpperCase() &&
    ["coinbase", "coinbase exchange"].includes(context.venue?.trim().toLowerCase() ?? "") &&
    context.instrument?.trim().toLowerCase() === "spot" &&
    ["BTC", "BITCOIN", "BTC-USD", "ETH", "ETHEREUM", "ETH-USD", "SOL", "SOL-USD"].includes(subject.trim().toUpperCase());
}

export function verifyCoinbasePath(
  source: CheckedSource,
  subject: string,
  submittedAt: string,
  expiry: string,
  terms: Terms,
  context: MarketContext,
) {
  if (!supportsCoinbaseSpot(subject, context, "Traders"))
    return { status: "Inconclusive" as const, reason: "The registered asset, venue or instrument is outside Coinbase Exchange spot coverage." };
  if (source.id !== "market-history" || source.status !== "retrieved")
    return { status: "Inconclusive" as const, reason: "Supported historical source unavailable." };
  try {
    const facts: unknown = JSON.parse(source.facts);
    if (!facts || typeof facts !== "object") throw new Error("Invalid observations");
    const record = facts as Record<string, unknown>;
    const pair = { ETH: "ETH-USD", ETHEREUM: "ETH-USD", "ETH-USD": "ETH-USD", BTC: "BTC-USD", BITCOIN: "BTC-USD", "BTC-USD": "BTC-USD", SOL: "SOL-USD", "SOL-USD": "SOL-USD" }[subject.trim().toUpperCase()];
    if (!pair || record.market !== pair || record.bucketSeconds !== 3600 || !Array.isArray(record.candles) ||
      !Number.isInteger(record.expectedBuckets) || record.expectedBuckets !== record.candles.length || record.missingBuckets !== 0)
      throw new Error("Unsupported or incomplete market history");
    const start = Date.parse(String(record.start));
    const end = Date.parse(String(record.endExclusive));
    const submitted = Date.parse(submittedAt);
    const due = Date.parse(expiry);
    if (![start, end, submitted, due].every(Number.isFinite) || start > submitted || end > due || submitted >= due)
      throw new Error("Observation window does not match registered terms");
    const bars = record.candles.map((raw) => {
      if (!Array.isArray(raw) || raw.length !== 6 || raw.some((x) => typeof x !== "number" || !Number.isFinite(x)))
        throw new Error("Invalid candle");
      return { at: new Date(raw[0] * 1000).toISOString(), low: raw[1] as number, high: raw[2] as number };
    });
    if (bars.length === 0 || bars[0]!.at !== new Date(start).toISOString() ||
      bars.at(-1)!.at !== new Date(end - 3600000).toISOString() ||
      bars.some((b, i) => Date.parse(b.at) !== start + i * 3600000))
      throw new Error("Missing or misordered buckets");
    const entry = Number(terms.entry), stop = Number(terms.stop), target = Number(terms.target);
    if (terms.direction !== "long" && terms.direction !== "short") throw new Error("Direction absent");
    const firstPartial = bars[0] && start < submitted;
    if (firstPartial && bars[0]!.low <= entry && bars[0]!.high >= entry)
      return { status: "Inconclusive" as const, reason: "Entry could have preceded submission within the first hourly bucket." };
    const path = settlePricePath(firstPartial ? bars.slice(1) : bars, {
      side: terms.direction, entry, stop, target, expiry,
    }, end >= due);
    return path;
  } catch {
    return { status: "Inconclusive" as const, reason: "Historical observations are incomplete, malformed or mismatched to the registered asset." };
  }
}
