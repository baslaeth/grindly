import { afterEach, expect, it, vi } from "vitest";
import { createPublicClient, http } from "viem";
vi.mock("server-only", () => ({}));
import {
  classifyFailure,
  reportFailure,
  withRequestDiagnostics,
  ownershipDiagnostics,
  safeRpcError,
  validRpcCode,
} from "@/server/diagnostics";
afterEach(() => vi.restoreAllMocks());
it("observes real viem HTTP retries and JSON-RPC-over-HTTP failure status", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const observer = ownershipDiagnostics();
  const fetchFn = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32005, message: "SECRET upstream message" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
  );
  const client = createPublicClient({
    transport: http("https://example.test/SECRET", {
      fetchFn,
      retryCount: 1,
      retryDelay: 0,
      onFetchRequest: observer.onFetchRequest,
      onFetchResponse: observer.onFetchResponse,
    }),
  });
  await expect(
    observer.step("ownership.network", () => client.getChainId()),
  ).rejects.toBeTruthy();
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(JSON.parse(warn.mock.calls[0]![0])).toMatchObject({
    attemptCount: 2,
    httpStatus: 500,
    rpcCode: -32005,
    classification: "rpc_response",
  });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET");
});
it("correlates concurrent response IDs without copying provider errors", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const responses = await Promise.all(
    ["research.read", "research.mutation"].map((stage) =>
      withRequestDiagnostics(async () => {
        await Promise.resolve();
        reportFailure(stage, new Error("SECRET cookie and provider URL"));
        return new Response("safe", { status: 503 });
      }),
    ),
  );
  const ids = responses.map((r) => r.headers.get("x-request-id"));
  expect(new Set(ids).size).toBe(2);
  for (const [line] of warn.mock.calls) {
    expect(ids).toContain(JSON.parse(line).requestId);
    expect(line).not.toContain("SECRET");
  }
});
it.each(["-32000", NaN, Infinity, 1.5, 2147483648, -2147483649])(
  "rejects invalid numeric RPC code %s",
  (code) => {
    expect(validRpcCode(code)).toBeNull();
  },
);
it("distinguishes JSON-RPC responses from transport errors, excluding arbitrary fields", () => {
  const error = {
    name: "ContractFunctionExecutionError",
    cause: {
      name: "RpcRequestError",
      code: -32000,
      message: "SECRET",
      data: "SECRET",
      cause: { name: "SECRET", code: "SECRET" },
    },
  };
  expect(classifyFailure(error)).toBe("rpc_response");
  expect(safeRpcError(error)).toEqual({
    rpcCode: -32000,
    httpStatus: null,
    errorTypes: ["ContractFunctionExecutionError", "RpcRequestError"],
    transportCode: null,
  });
  expect(JSON.stringify(safeRpcError(error))).not.toContain("SECRET");
  expect(safeRpcError({ name: "Error", code: -32000 }).rpcCode).toBeNull();
});
it("counts actual retry attempts and retains HTTP status even for a JSON-RPC error", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const observer = ownershipDiagnostics();
  const error = {
    name: "RpcRequestError",
    code: -32005,
    message: "SECRET response",
  };
  await expect(
    observer.step("ownership.owner", async () => {
      observer.onFetchRequest();
      observer.onFetchResponse(new Response(null, { status: 500 }));
      observer.onFetchRequest();
      observer.onFetchResponse(new Response(null, { status: 429 }));
      throw error;
    }),
  ).rejects.toBe(error);
  expect(JSON.parse(warn.mock.calls[0]![0])).toMatchObject({
    attemptCount: 2,
    httpStatus: 429,
    rpcCode: -32005,
    classification: "rpc_response",
    elapsedMs: expect.any(Number),
    requestId: expect.any(String),
  });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET");
  await expect(
    observer.step("ownership.epoch", async () => {
      observer.onFetchRequest();
      throw { name: "TypeError", cause: { code: "ECONNRESET" } };
    }),
  ).rejects.toBeTruthy();
  expect(JSON.parse(warn.mock.calls[1]![0])).toMatchObject({
    attemptCount: 1,
    httpStatus: null,
    rpcCode: null,
    transportCode: "ECONNRESET",
  });
});
it("keeps concurrent ownership observers independent and bounds cyclic causes", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error: { name: string; cause?: unknown } = { name: "TimeoutError" };
  error.cause = error;
  const observers = [ownershipDiagnostics(), ownershipDiagnostics()];
  await Promise.allSettled(
    observers.map((o, i) =>
      o.step("ownership.block", async () => {
        for (let n = 0; n <= i; n++) o.onFetchRequest();
        await Promise.resolve();
        throw error;
      }),
    ),
  );
  const logs = warn.mock.calls.map(([s]) => JSON.parse(s));
  expect(logs.map((l) => l.attemptCount)).toEqual([1, 2]);
  expect(new Set(logs.map((l) => l.requestId)).size).toBe(2);
  expect(logs[0].errorTypes).toEqual(["TimeoutError"]);
});
it("classifies wrapped timeout failures without reading exception messages", () => {
  expect(
    classifyFailure({
      name: "ContractFunctionExecutionError",
      cause: { name: "TimeoutError" },
    }),
  ).toBe("timeout");
});
