import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { AlphaVersion, CheckedSource } from "@/alpha/model";
import { evidenceJson, EvidenceFailure } from "./evidence-http";

const evm = /^0x[0-9a-fA-F]{40}$/;
const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const networks: Record<string, { dex: string; llama: string; id: string }> = {
  "1": { dex: "ethereum", llama: "ethereum", id: "1" },
  "56": { dex: "bsc", llama: "bsc", id: "56" },
  "137": { dex: "polygon", llama: "polygon", id: "137" },
  "42161": { dex: "arbitrum", llama: "arbitrum", id: "42161" },
  "8453": { dex: "base", llama: "base", id: "8453" },
};
export function evidenceAsset(alpha: Pick<AlphaVersion, "chain" | "contract">) {
  const chain = alpha.chain.trim().toLowerCase();
  const address = alpha.contract.trim();
  const network =
    networks[chain] ?? Object.values(networks).find((n) => n.dex === chain);
  if (network && evm.test(address))
    return { ...network, address: address.toLowerCase() };
  if (["solana", "solana mainnet-beta"].includes(chain) && base58.test(address))
    return { dex: "solana", llama: "solana", id: "solana-mainnet", address };
  return null;
}
type Reading = { label: string; value: string; unit?: string };
type Observation = {
  at: string;
  readings: Reading[];
  observedAt?: string | null;
  limitations: string;
};
export async function observation(
  alpha: AlphaVersion,
  id: string,
  provider: string,
  url: string | null,
  read: () => Promise<Observation>,
): Promise<CheckedSource> {
  try {
    const data = await read();
    const facts = JSON.stringify({
      provider,
      version: alpha.version_id,
      network: alpha.chain || "Unknown",
      asset: alpha.contract || alpha.subject,
      observedAt: data.observedAt ?? null,
      readings: data.readings,
      limitations: data.limitations,
    });
    return {
      id,
      label: provider,
      url,
      checkedAt: data.at,
      publishedAt: data.observedAt ?? null,
      status: "retrieved",
      facts,
      digest: createHash("sha256").update(facts).digest("hex"),
    };
  } catch (e) {
    const reason =
      e instanceof EvidenceFailure ? e.kind : "unavailable_or_invalid";
    return {
      id,
      label: provider,
      url,
      checkedAt: new Date().toISOString(),
      publishedAt: null,
      status: "unknown",
      facts: JSON.stringify({
        provider,
        version: alpha.version_id,
        network: alpha.chain || "Unknown",
        asset: alpha.contract || alpha.subject,
        observedAt: null,
        readings: [],
        limitations: `Unknown: ${reason.replaceAll("_", " ")}. No claim or outcome was verified.`,
      }),
      digest: null,
    };
  }
}
const finite = z.number().finite().nonnegative();
export function dexSource(alpha: AlphaVersion) {
  const asset = evidenceAsset(alpha);
  const url = asset
    ? `https://api.dexscreener.com/token-pairs/v1/${asset.dex}/${asset.address}`
    : null;
  return observation(alpha, "dex", "DEX Screener", url, async () => {
    if (!asset || !url) throw new EvidenceFailure("invalid");
    const { at, data } = await evidenceJson(url);
    const pairs = z
      .array(
        z.object({
          chainId: z.string(),
          pairAddress: z.string(),
          baseToken: z.object({ address: z.string() }),
          priceUsd: z
            .string()
            .regex(/^\d+(\.\d+)?$/)
            .optional(),
          liquidity: z.object({ usd: finite.optional() }).optional(),
          volume: z.object({ h24: finite.optional() }).optional(),
          pairCreatedAt: finite.optional(),
        }),
      )
      .max(500)
      .parse(data);
    const equal = (a: string, b: string) =>
      asset.dex === "solana" ? a === b : a.toLowerCase() === b.toLowerCase();
    const selected = pairs
      .filter(
        (p) =>
          p.chainId === asset.dex && equal(p.baseToken.address, asset.address),
      )
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
      .slice(0, 3);
    if (!selected.length) throw new EvidenceFailure("invalid");
    return {
      at,
      readings: selected.flatMap((p) => [
        { label: "Pair address", value: p.pairAddress },
        {
          label: "Base-token price",
          value: p.priceUsd ?? "Unknown",
          unit: "USD",
        },
        {
          label: "Reported liquidity",
          value: String(p.liquidity?.usd ?? "Unknown"),
          unit: "USD",
        },
        {
          label: "Rolling 24h volume",
          value: String(p.volume?.h24 ?? "Unknown"),
          unit: "USD",
        },
        {
          label: "Provider pair creation time",
          value:
            p.pairCreatedAt && p.pairCreatedAt <= Date.now()
              ? new Date(p.pairCreatedAt).toISOString()
              : "Unknown",
        },
      ]),
      limitations:
        "Up to three matching base-token pairs ranked by reported liquidity. Quote-side prices are not attributed to the submitted token. Snapshot time is retrieval time; rolling volume is not historical coverage. Pair creation is not project founding, safety or forecast success.",
    };
  });
}
export function llamaPriceSource(alpha: AlphaVersion, historical = false) {
  const asset = evidenceAsset(alpha);
  const target = alpha.horizon
    ? Math.floor(Date.parse(alpha.horizon) / 1000)
    : NaN;
  const coin = asset ? `${asset.llama}:${asset.address}` : null;
  const url = coin
    ? `https://coins.llama.fi/prices/${historical ? `historical/${target}` : "current"}/${coin}`
    : null;
  return observation(
    alpha,
    historical ? "llama-history" : "llama-price",
    historical ? "DefiLlama historical price" : "DefiLlama current price",
    historical && (!Number.isFinite(target) || target * 1000 > Date.now())
      ? null
      : url,
    async () => {
      if (
        !url ||
        !coin ||
        (historical && (!Number.isFinite(target) || target * 1000 > Date.now()))
      )
        throw new EvidenceFailure("invalid");
      const { at, data } = await evidenceJson(url);
      const parsed = z
        .object({
          coins: z.record(
            z.string(),
            z.object({
              price: finite,
              timestamp: finite,
              confidence: z.number().min(0).max(1).optional(),
              symbol: z.string().max(40).optional(),
            }),
          ),
        })
        .parse(data);
      const item = parsed.coins[coin];
      if (
        !item ||
        Math.abs(item.timestamp - (historical ? target : Date.now() / 1000)) >
          3600
      )
        throw new EvidenceFailure("invalid");
      return {
        at,
        observedAt: new Date(item.timestamp * 1000).toISOString(),
        readings: [
          { label: "Price", value: String(item.price), unit: "USD" },
          {
            label: "Provider confidence",
            value:
              item.confidence === undefined
                ? "Unknown"
                : String(item.confidence),
          },
          {
            label: "Requested time",
            value: historical
              ? new Date(target * 1000).toISOString()
              : "Current",
          },
        ],
        limitations:
          "Exact chain/address lookup; provider observation may be up to one hour from requested time. A point is not a price path, execution or evidence that a target was hit. No automatic outcome assessment.",
      };
    },
  );
}
export function llamaProtocolSource(alpha: AlphaVersion) {
  const link = alpha.evidence.find(
    (e) =>
      e.kind === "link" &&
      /^https:\/\/defillama\.com\/protocol\/[a-z0-9-]+$/.test(e.value),
  );
  if (!link) return null;
  const slug = new URL(link.value).pathname.split("/").at(-1)!;
  const url = `https://api.llama.fi/tvl/${slug}`;
  return observation(
    alpha,
    "llama-tvl",
    "DefiLlama protocol TVL",
    url,
    async () => {
      const { at, data } = await evidenceJson(url);
      const tvl = finite.parse(data);
      return {
        at,
        readings: [
          { label: "Explicit protocol reference", value: slug },
          { label: "Reported current TVL", value: String(tvl), unit: "USD" },
        ],
        limitations:
          "Public aggregate TVL only. No funding, revenue, user count or adoption inference. Paid project metrics are not requested; methodology and historical coverage require additional evidence.",
      };
    },
  );
}
export function goPlusSource(alpha: AlphaVersion) {
  const asset = evidenceAsset(alpha);
  const url =
    asset && asset.id !== "solana-mainnet"
      ? `https://api.gopluslabs.io/api/v1/token_security/${asset.id}?contract_addresses=${asset.address}`
      : null;
  return observation(
    alpha,
    "goplus",
    "GoPlus token risk flags",
    url,
    async () => {
      if (!url || !asset) throw new EvidenceFailure("invalid");
      const { at, data } = await evidenceJson(url);
      const parsed = z
        .object({
          code: z.literal(1),
          result: z.record(z.string(), z.record(z.string(), z.unknown())),
        })
        .parse(data);
      const flags = parsed.result[asset.address];
      if (!flags) throw new EvidenceFailure("invalid");
      const fields = [
        "is_honeypot",
        "is_open_source",
        "is_proxy",
        "is_mintable",
        "can_take_back_ownership",
        "owner_change_balance",
        "hidden_owner",
        "selfdestruct",
        "cannot_sell_all",
        "is_blacklisted",
      ];
      return {
        at,
        readings: fields.map((label) => ({
          label: label.replaceAll("_", " "),
          value:
            flags[label] === "1"
              ? "Reported yes"
              : flags[label] === "0"
                ? "Reported no"
                : "Unknown",
        })),
        limitations:
          "Unauthenticated single-token response on a supported EVM chain. Provider flags, not an audit or safety guarantee. Missing flags remain Unknown; reported no does not establish safety. Current checks cannot reconstruct historical risk.",
      };
    },
  );
}
const rpcResult = (data: unknown) =>
  z.object({ jsonrpc: z.literal("2.0"), result: z.unknown() }).parse(data)
    .result;
export function solanaSource(alpha: AlphaVersion) {
  const dev = alpha.chain.trim().toLowerCase() === "solana devnet";
  const supported =
    dev ||
    ["solana", "solana mainnet-beta"].includes(
      alpha.chain.trim().toLowerCase(),
    );
  const url = dev
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
  return observation(
    alpha,
    "solana",
    `Solana ${dev ? "devnet (testnet assets)" : "mainnet-beta"} public RPC`,
    url,
    async () => {
      if (!supported || !base58.test(alpha.contract))
        throw new EvidenceFailure("invalid");
      const { at, data } = await evidenceJson(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [
          alpha.contract,
          { encoding: "jsonParsed", commitment: "finalized" },
        ],
      });
      const account = z
        .object({
          context: z.object({ slot: finite }),
          value: z
            .object({
              lamports: finite,
              owner: z.string(),
              executable: z.boolean(),
              data: z.unknown(),
            })
            .nullable(),
        })
        .parse(rpcResult(data));
      if (!account.value) throw new EvidenceFailure("invalid");
      const readings: Reading[] = [
        { label: "Finalized slot", value: String(account.context.slot) },
        { label: "Account owner program", value: account.value.owner },
        {
          label: "Account balance",
          value: String(account.value.lamports),
          unit: "lamports",
        },
      ];
      const token = z
        .object({
          program: z.enum(["spl-token", "spl-token-2022"]),
          parsed: z.object({
            type: z.literal("mint"),
            info: z.object({
              decimals: z.number().int().min(0).max(255),
              supply: z.string().regex(/^\d+$/),
            }),
          }),
        })
        .safeParse(account.value.data);
      if (token.success)
        readings.push({
          label: "Mint supply (raw integer)",
          value: token.data.parsed.info.supply,
          unit: `base units; ${token.data.parsed.info.decimals} decimals`,
        });
      // Use the existing link evidence type; no change to applied transaction constraints.
      const signature = alpha.evidence.flatMap((e) => {
        if (e.kind !== "link") return [];
        try {
          const u = new URL(e.value);
          const match = /^\/tx\/([1-9A-HJ-NP-Za-km-z]{64,88})$/.exec(
            u.pathname,
          );
          return u.protocol === "https:" &&
            u.hostname === "explorer.solana.com" &&
            !u.port &&
            !u.username &&
            !u.password &&
            !u.hash &&
            (dev ? u.search === "?cluster=devnet" : !u.search) &&
            match
            ? [match[1]!]
            : [];
        } catch {
          return [];
        }
      })[0];
      const tx = signature ? { value: signature } : undefined;
      if (tx) {
        const response = await evidenceJson(url, {
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [
            tx.value,
            {
              encoding: "jsonParsed",
              commitment: "finalized",
              maxSupportedTransactionVersion: 0,
            },
          ],
        });
        const result = z
          .object({
            slot: finite,
            blockTime: finite.nullable(),
            transaction: z.object({
              signatures: z.array(z.string()),
              message: z.object({
                accountKeys: z.array(z.object({ pubkey: z.string() })),
              }),
            }),
            meta: z.object({ err: z.unknown() }).nullable(),
          })
          .nullable()
          .parse(rpcResult(response.data));
        if (
          result &&
          result.transaction.signatures.includes(tx.value) &&
          result.transaction.message.accountKeys.some(
            (k) => k.pubkey === alpha.contract,
          )
        )
          readings.push(
            { label: "Referenced transaction", value: tx.value },
            {
              label: "Transaction execution",
              value: result.meta
                ? result.meta.err === null
                  ? "Succeeded"
                  : "Failed"
                : "Unknown",
            },
            {
              label: "Transaction time",
              value: result.blockTime
                ? new Date(result.blockTime * 1000).toISOString()
                : "Unknown",
            },
          );
        else
          readings.push({
            label: "Referenced transaction",
            value: "Unknown: unavailable or not linked to this account",
          });
      }
      return {
        at,
        readings,
        limitations:
          "Finalized account/mint and at most one referenced transaction, not wallet history, token security, beneficial ownership or prediction verification. Mainnet and devnet remain separate; Grindly membership still uses Robinhood Chain testnet.",
      };
    },
  );
}
export function optionalAccountSource(alpha: AlphaVersion) {
  const asset = evidenceAsset(alpha);
  if (!asset || !["1", "solana-mainnet"].includes(asset.id)) return null;
  const helius = asset.id === "solana-mainnet";
  const provider = helius
    ? "Helius asset metadata"
    : "Alchemy Ethereum transaction";
  const key = helius ? process.env.HELIUS_API_KEY : process.env.ALCHEMY_API_KEY;
  return observation(
    alpha,
    "optional-account",
    provider,
    helius
      ? "https://www.helius.dev/docs/api-reference/das/getasset"
      : "https://www.alchemy.com/docs/node/ethereum/ethereum-api-endpoints/eth-get-transaction-receipt",
    async () => {
      if (!key) throw new EvidenceFailure("unconfigured");
      const tx = alpha.evidence.find(
        (e) => e.kind === "transaction" && /^0x[0-9a-fA-F]{64}$/.test(e.value),
      );
      if (!helius && !tx) throw new EvidenceFailure("invalid");
      const url = helius
        ? `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`
        : `https://eth-mainnet.g.alchemy.com/v2/${encodeURIComponent(key)}`;
      const { at, data } = await evidenceJson(url, {
        jsonrpc: "2.0",
        id: 1,
        method: helius ? "getAsset" : "eth_getTransactionReceipt",
        params: helius ? { id: asset.address } : [tx!.value],
      });
      let readings: Reading[];
      if (helius) {
        const item = z
          .object({
            id: z.literal(asset.address),
            interface: z.string().max(80),
            ownership: z.object({ owner: z.string().max(64) }).optional(),
          })
          .parse(rpcResult(data));
        readings = [
          { label: "Asset type", value: item.interface },
          {
            label: "Provider-recorded owner",
            value: item.ownership?.owner ?? "Unknown",
          },
        ];
      } else {
        const item = z
          .object({
            transactionHash: z.literal(tx!.value),
            to: z.string().nullable(),
            blockNumber: z.string().regex(/^0x[\da-f]+$/i),
            status: z.enum(["0x0", "0x1"]),
          })
          .parse(rpcResult(data));
        if (item.to?.toLowerCase() !== asset.address)
          throw new EvidenceFailure("invalid");
        readings = [
          { label: "Transaction", value: item.transactionHash },
          { label: "Block", value: BigInt(item.blockNumber).toString() },
          {
            label: "Execution",
            value: item.status === "0x1" ? "Succeeded" : "Failed",
          },
        ];
      }
      return {
        at,
        readings,
        limitations:
          "Optional free-account provider; no paid plan enabled. Current index/receipt only, not historical ownership provenance, investment safety or Grindly membership verification. Provider URL credentials are never persisted.",
      };
    },
  );
}
