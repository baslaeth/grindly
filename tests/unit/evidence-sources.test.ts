import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  evidenceAsset,
  dexSource,
  llamaPriceSource,
  goPlusSource,
  solanaSource,
  optionalAccountSource,
} from "@/server/alpha/public-sources";
import { clearEvidenceCache, evidenceJson } from "@/server/alpha/evidence-http";
import { localModelConfiguration } from "@/server/alpha/local-model";
import { marketHistorySource } from "@/server/alpha/sources";
import type { AlphaVersion } from "@/alpha/model";
const a: AlphaVersion = {
  version_id: "test-version",
  category: "Traders",
  contribution_type: "prediction",
  purpose: "test",
  subject: "ETH",
  chain: "1",
  contract: "0x" + "a".repeat(40),
  details: {},
  evidence: [],
  first_noticed: null,
  horizon: new Date(Date.now() - 86400000).toISOString(),
  check_condition: "Original condition",
  source_created_at: null,
  created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
};
const reply = (data: unknown) => new Response(JSON.stringify(data));
afterEach(() => {
  clearEvidenceCache();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("requires supported network plus exact identifier, never derives chain from a ticker", () => {
  expect(evidenceAsset({ ...a, chain: "46630" })).toBeNull();
  expect(evidenceAsset({ ...a, chain: "Solana" })).toBeNull();
  expect(evidenceAsset({ ...a, contract: "ETH" })).toBeNull();
  expect(evidenceAsset(a)?.id).toBe("1");
});
it("rejects wrong-chain and quote-side pair prices", async () => {
  const fetch = vi.fn().mockResolvedValue(
    reply([
      {
        chainId: "base",
        pairAddress: "pair",
        baseToken: { address: a.contract },
        priceUsd: "1",
      },
      {
        chainId: "ethereum",
        pairAddress: "pair",
        baseToken: { address: "0x" + "b".repeat(40) },
        priceUsd: "1",
      },
    ]),
  );
  vi.stubGlobal("fetch", fetch);
  expect((await dexSource(a)).status).toBe("unknown");
});
it("preserves current pair provenance and marks rolling data, not historical success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      reply([
        {
          chainId: "ethereum",
          pairAddress: "pair",
          baseToken: { address: a.contract },
          priceUsd: "1.01",
          volume: { h24: 12 },
          liquidity: { usd: 30 },
          pairCreatedAt: 1700000000000,
        },
      ]),
    ),
  );
  const result = await dexSource(a);
  expect(result.status).toBe("retrieved");
  expect(result.facts).toContain(a.version_id);
  expect(result.facts).toContain("not historical coverage");
  expect(result.publishedAt).toBeNull();
});
it("uses correct free price host and rejects unavailable historical point", async () => {
  const fetch = vi.fn().mockResolvedValue(reply({ coins: {} }));
  vi.stubGlobal("fetch", fetch);
  expect((await llamaPriceSource(a, true)).status).toBe("unknown");
  expect(String(fetch.mock.calls[0]![0])).toContain(
    "https://coins.llama.fi/prices/historical/",
  );
});
it("does not query a future price or infer safety from missing risk flags", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      reply({ code: 1, result: { [a.contract]: { is_honeypot: "0" } } }),
    );
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await llamaPriceSource(
        { ...a, horizon: new Date(Date.now() + 86400000).toISOString() },
        true,
      )
    ).status,
  ).toBe("unknown");
  expect(fetch).not.toHaveBeenCalled();
  const result = await goPlusSource(a);
  expect(result.facts).toContain("Unknown");
  expect(result.facts).toContain("not an audit or safety guarantee");
  expect(String(fetch.mock.calls[0]![0])).toContain(
    `contract_addresses=${a.contract}`,
  );
});
it("bounds caching, preserves retrieval time, rejects SSRF and never retries 429", async () => {
  const fetch = vi.fn().mockResolvedValue(reply({ coins: {} }));
  vi.stubGlobal("fetch", fetch);
  const url = "https://coins.llama.fi/prices/current/ethereum:" + a.contract;
  const first = await evidenceJson(url);
  expect(await evidenceJson(url)).toEqual(first);
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(evidenceJson("https://127.0.0.1/private")).rejects.toThrow(
    "invalid",
  );
  fetch.mockResolvedValueOnce(
    new Response("private upstream message", { status: 429 }),
  );
  expect((await dexSource(a)).facts).toContain("rate limited");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("rejects oversized responses and keeps provider errors out of saved facts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("sensitive".repeat(40000))),
  );
  const result = await dexSource(a);
  expect(result.status).toBe("unknown");
  expect(result.facts).not.toContain("sensitive");
});
it("bounds historical candles to seven days and preserves missing coverage", async () => {
  const end = Math.floor(Date.parse(a.horizon!) / 3600000) * 3600;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(reply([[end - 3600, 1, 3, 2, 2, 10]])),
  );
  const result = await marketHistorySource(a);
  expect(result.status).toBe("retrieved");
  const data = JSON.parse(result.facts);
  expect(data.expectedBuckets).toBe(168);
  expect(data.missingBuckets).toBe(167);
  expect(data.limitations).toContain("No automated success");
});
it("keeps optional providers and local model disconnected without credentials/configuration", async () => {
  vi.stubEnv("ALCHEMY_API_KEY", "");
  vi.stubEnv("HELIUS_API_KEY", "");
  vi.stubEnv("OLLAMA_MODEL", "");
  vi.stubGlobal("fetch", vi.fn());
  expect((await optionalAccountSource(a))?.facts).toContain("unconfigured");
  expect(() => localModelConfiguration(true)).toThrow("not connected");
  expect(fetch).not.toHaveBeenCalled();
});
it("does not redirect a devnet reference to mainnet or accept EVM keys for Solana", async () => {
  const fetch = vi.fn().mockResolvedValue(
    reply({
      jsonrpc: "2.0",
      result: {
        context: { slot: 12 },
        value: {
          lamports: 10,
          owner: "program",
          executable: false,
          data: {},
        },
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  expect((await solanaSource(a)).status).toBe("unknown");
  expect(fetch).not.toHaveBeenCalled();
  const result = await solanaSource({
    ...a,
    chain: "Solana devnet",
    contract: "So11111111111111111111111111111111111111112",
  });
  expect(result.status).toBe("retrieved");
  expect(String(fetch.mock.calls[0]![0])).toBe(
    "https://api.devnet.solana.com/",
  );
  expect(result.label).toContain("devnet");
});

it("keeps configured optional-provider credentials out of persisted observations", async () => {
  const key = "isolated-test-key-not-a-credential";
  const hash = "0x" + "b".repeat(64);
  vi.stubEnv("ALCHEMY_API_KEY", key);
  const fetch = vi.fn().mockResolvedValue(
    reply({
      jsonrpc: "2.0",
      result: {
        transactionHash: hash,
        to: a.contract,
        blockNumber: "0x10",
        status: "0x1",
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await optionalAccountSource({
    ...a,
    evidence: [
      { kind: "transaction", value: hash, label: "Isolated transaction" },
    ],
  });
  expect(result?.status).toBe("retrieved");
  expect(result?.facts).toContain("Succeeded");
  expect(JSON.stringify(result)).not.toContain(key);
  expect(String(fetch.mock.calls[0]![0])).toContain(
    "eth-mainnet.g.alchemy.com/v2/",
  );
  clearEvidenceCache();
  fetch.mockResolvedValue(
    reply({
      jsonrpc: "2.0",
      result: {
        transactionHash: hash,
        to: "0x" + "c".repeat(40),
        blockNumber: "0x10",
        status: "0x1",
      },
    }),
  );
  expect(
    (
      await optionalAccountSource({
        ...a,
        evidence: [
          { kind: "transaction", value: hash, label: "Isolated transaction" },
        ],
      })
    )?.status,
  ).toBe("unknown");
});

it("requires the exact Helius asset, without inferring ownership history or rank", async () => {
  vi.stubEnv("HELIUS_API_KEY", "isolated-helius-test-key");
  const mint = "So11111111111111111111111111111111111111112";
  const fetch = vi
    .fn()
    .mockResolvedValue(
      reply({
        jsonrpc: "2.0",
        result: { id: mint, interface: "FungibleToken" },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  const result = await optionalAccountSource({
    ...a,
    chain: "Solana",
    contract: mint,
  });
  expect(result?.status).toBe("retrieved");
  expect(result?.facts).toContain('"value":"Unknown"');
  expect(JSON.stringify(result)).not.toContain("isolated-helius-test-key");
  clearEvidenceCache();
  fetch.mockResolvedValue(
    reply({
      jsonrpc: "2.0",
      result: { id: "different-mint", interface: "FungibleToken" },
    }),
  );
  expect(
    (await optionalAccountSource({ ...a, chain: "Solana", contract: mint }))
      ?.status,
  ).toBe("unknown");
});

it("only attributes a Solana transaction matching both its signature and referenced account", async () => {
  const mint = "So11111111111111111111111111111111111111112";
  const signature = "2".repeat(88);
  const account = {
    jsonrpc: "2.0",
    result: {
      context: { slot: 12 },
      value: { lamports: 10, owner: "program", executable: false, data: {} },
    },
  };
  const transaction = {
    jsonrpc: "2.0",
    result: {
      slot: 12,
      blockTime: null,
      transaction: {
        signatures: [signature],
        message: { accountKeys: [{ pubkey: mint }] },
      },
      meta: { err: null },
    },
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(account))
    .mockResolvedValueOnce(reply(transaction));
  vi.stubGlobal("fetch", fetch);
  const alpha = {
    ...a,
    chain: "Solana",
    contract: mint,
    evidence: [
      {
        kind: "link" as const,
        value: `https://explorer.solana.com/tx/${signature}`,
        label: "Isolated transaction",
      },
    ],
  };
  expect((await solanaSource(alpha)).facts).toContain('"value":"Succeeded"');
  expect(JSON.parse(fetch.mock.calls[1]![1].body).method).toBe(
    "getTransaction",
  );
  clearEvidenceCache();
  transaction.result.transaction.message.accountKeys = [
    { pubkey: "different-account" },
  ];
  fetch
    .mockResolvedValueOnce(reply(account))
    .mockResolvedValueOnce(reply(transaction));
  const mismatch = await solanaSource(alpha);
  expect(mismatch.facts).toContain("not linked to this account");
  expect(mismatch.facts).not.toContain("Succeeded");
});
