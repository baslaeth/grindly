// Opt-in, read-only diagnostic. No signed transactions, sessions or raw RPC data.
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { encodeFunctionData, toHex } from "viem";
import { membershipAbi, readOwnership } from "../src/server/membership/chain";
import { safeRpcError, validRpcCode } from "../src/server/diagnostics";

if (process.env.GRINDLY_PROBE !== "1")
  throw new Error("Set GRINDLY_PROBE=1 for limited read-only probes");
const mode = process.argv[2];
if (!["direct", "raw", "local", "production"].includes(mode ?? ""))
  throw new Error("Use direct, raw, local or production");
const rpc = process.env.ROBINHOOD_RPC_URL!;
const address = process.env.MEMBERSHIP_CONTRACT_ADDRESS as `0x${string}`;
const app =
  mode === "production"
    ? "https://grindly-woad.vercel.app"
    : "http://localhost:3000";
const results: Record<string, unknown>[] = [];
const code = (v: unknown) =>
  typeof v === "string" &&
  ["CHAIN_UNAVAILABLE", "TOKEN_NOT_FOUND", "SERVICE_UNAVAILABLE"].includes(v)
    ? v
    : null;
const requestId = (v: string | null) =>
  v && /^[a-zA-Z0-9:_-]{1,160}$/.test(v) ? v : null;
let rawId = 0;
async function raw(
  method: string,
  params: unknown[],
  sample: Record<string, unknown>,
) {
  const start = performance.now();
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rawId, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (body.error || !response.ok) {
    Object.assign(sample, {
      rpcStage: method,
      httpStatus: response.status,
      rpcCode: validRpcCode(body.error?.code),
      rpcElapsedMs: Math.round(performance.now() - start),
      attemptCount: 1,
    });
    throw new Error("Raw probe failed");
  }
  return body.result;
}
async function probe(concurrency: number, index: number) {
  const started = performance.now();
  const sample: Record<string, unknown> = {
    mode,
    concurrency,
    index,
    time: new Date().toISOString(),
    token: "2",
  };
  try {
    if (mode === "direct") {
      await readOwnership(2n);
      sample.ok = true;
    } else if (mode === "raw") {
      if ((await raw("eth_chainId", [], sample)) !== "0xb626")
        throw new Error("Wrong chain");
      const block = await raw(
        "eth_getBlockByNumber",
        ["latest", false],
        sample,
      );
      for (const functionName of ["ownerOf", "ownershipEpoch"] as const) {
        sample.operation = functionName;
        const data = encodeFunctionData({
          abi: membershipAbi,
          functionName,
          args: [2n],
        });
        const result = await raw(
          "eth_call",
          [{ to: address, data }, toHex(BigInt(block.number))],
          sample,
        );
        if (typeof result !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(result))
          throw new Error("Invalid RPC result");
      }
      const same = await raw(
        "eth_getBlockByNumber",
        [block.number, false],
        sample,
      );
      if (same.hash !== block.hash) throw new Error("Block consistency failed");
      sample.ok = true;
    } else {
      const response = await fetch(`${app}/api/metadata/46630/2`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.json();
      Object.assign(sample, {
        ok: response.ok && body.name === "Grindly Membership #2",
        httpStatus: response.status,
        requestId: requestId(response.headers.get("x-request-id")),
        vercelId: requestId(response.headers.get("x-vercel-id")),
        errorCode: code(body.error?.code),
      });
    }
  } catch (error) {
    Object.assign(sample, {
      ok: false,
      errorCode: code((error as { code?: unknown })?.code),
      safeError: safeRpcError(error),
    });
  }
  sample.elapsedMs = Math.round(performance.now() - started);
  results.push(sample);
  console.log(JSON.stringify(sample));
}
// At most two simultaneous operations; separate phases with a quiet interval.
for (let i = 0; i < 10; i++) {
  await probe(1, i);
  await new Promise((r) => setTimeout(r, 300));
}
await new Promise((r) => setTimeout(r, 2000));
for (let i = 0; i < 3; i++) {
  await Promise.all([probe(2, i * 2), probe(2, i * 2 + 1)]);
  await new Promise((r) => setTimeout(r, 500));
}
const report = {
  mode,
  rpcFingerprint: createHash("sha256").update(rpc).digest("hex"),
  results,
  summary: {
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  },
};
await mkdir(".local/reliability-probes", { recursive: true });
await writeFile(
  `.local/reliability-probes/${mode}-${Date.now()}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report.summary));
