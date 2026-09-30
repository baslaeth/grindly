import "server-only";

export class EvidenceFailure extends Error {
  constructor(
    public readonly kind:
      "rate_limited" | "unavailable" | "invalid" | "unconfigured",
  ) {
    super(kind);
  }
}
const hosts = new Set([
  "api.exchange.coinbase.com",
  "api.dexscreener.com",
  "coins.llama.fi",
  "api.llama.fi",
  "api.gopluslabs.io",
  "api.mainnet-beta.solana.com",
  "api.devnet.solana.com",
  "mainnet.helius-rpc.com",
  "eth-mainnet.g.alchemy.com",
]);
const cache = new Map<string, { until: number; at: string; data: unknown }>();
const inflight = new Map<string, Promise<{ at: string; data: unknown }>>();
const calls = new Map<string, number[]>();
export async function limitedBody(response: Response, maximum = 250000) {
  if (!response.body) throw new EvidenceFailure("invalid");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new EvidenceFailure("invalid");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Only fixed provider destinations, never submitted URLs. Cache contains public data only.
export async function evidenceJson(
  url: string,
  body?: object,
): Promise<{ at: string; data: unknown }> {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !hosts.has(u.hostname)
  )
    throw new EvidenceFailure("invalid");
  const key = url + JSON.stringify(body ?? null);
  const saved = cache.get(key);
  if (saved && saved.until > Date.now()) return saved;
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = (async () => {
    const recent = (calls.get(u.hostname) ?? []).filter(
      (t) => t > Date.now() - 60000,
    );
    if (recent.length >= 12 || inflight.size >= 16)
      throw new EvidenceFailure("rate_limited");
    recent.push(Date.now());
    calls.set(u.hostname, recent);
    // One request, no automatic retry storm on rate limits or outage. Explicit refresh retries.
    const response = await fetch(u, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new EvidenceFailure(
        response.status === 429 ? "rate_limited" : "unavailable",
      );
    const data: unknown = JSON.parse(await limitedBody(response));
    const value = {
      at: new Date().toISOString(),
      data,
      until: Date.now() + 120000,
    };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
    return value;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
export function clearEvidenceCache() {
  cache.clear();
  calls.clear();
  inflight.clear();
}
