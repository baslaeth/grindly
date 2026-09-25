import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { ServiceError } from "./errors";

const requestContext = new AsyncLocalStorage<string>();
let configurationReported = false;
export function reportRpcConfiguration(url: string) {
  if (configurationReported) return;
  configurationReported = true;
  console.info(
    JSON.stringify({
      event: "grindly.rpc_configuration",
      documentedPublicEndpoint:
        url === "https://rpc.testnet.chain.robinhood.com" ||
        url === "https://rpc.testnet.chain.robinhood.com/",
    }),
  );
}
export type FailureClass =
  | "wrong_network"
  | "block_consistency"
  | "timeout"
  | "provider_unavailable"
  | "rpc_transport"
  | "rpc_response"
  | "access_denied"
  | "service_unavailable";

const errorTypes = new Set([
  "Error",
  "TypeError",
  "AbortError",
  "TimeoutError",
  "HttpRequestError",
  "RpcRequestError",
  "SocketClosedError",
  "ContractFunctionExecutionError",
  "ContractFunctionRevertedError",
  "ContractFunctionZeroDataError",
  "CallExecutionError",
  "InvalidInputRpcError",
  "InternalRpcError",
  "InvalidParamsRpcError",
  "ResourceUnavailableRpcError",
  "LimitExceededRpcError",
  "UnknownRpcError",
  "ResponseBodyTooLargeError",
  "BlockNotFoundError",
]);
const transportCodes = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
export const validHttpStatus = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 100 &&
  value <= 599
    ? value
    : null;
export const validRpcCode = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= -2147483648 &&
  value <= 2147483647
    ? value
    : null;

export function safeRpcError(error: unknown) {
  const types: string[] = [];
  let rpcCode: number | null = null;
  let httpStatus: number | null = null;
  let transportCode: string | null = null;
  const seen = new Set<object>();
  let cause = error;
  for (
    let depth = 0;
    depth < 8 && cause && typeof cause === "object" && !seen.has(cause);
    depth++
  ) {
    seen.add(cause);
    const e = cause as {
      name?: unknown;
      code?: unknown;
      status?: unknown;
      cause?: unknown;
    };
    if (
      typeof e.name === "string" &&
      errorTypes.has(e.name) &&
      !types.includes(e.name)
    )
      types.push(e.name);
    // RpcRequestError identifies a response from the upstream JSON-RPC server.
    // Other library error codes may be synthesized locally, so do not label them RPC responses.
    if (e.name === "RpcRequestError") rpcCode ??= validRpcCode(e.code);
    if (e.name === "HttpRequestError") httpStatus ??= validHttpStatus(e.status);
    if (typeof e.code === "string" && transportCodes.has(e.code))
      transportCode ??= e.code;
    cause = e.cause;
  }
  return { rpcCode, httpStatus, errorTypes: types, transportCode };
}

export function classifyFailure(
  error: unknown,
  fallback: FailureClass = "service_unavailable",
): FailureClass {
  if (error instanceof ServiceError)
    return [401, 403, 404].includes(error.status)
      ? "access_denied"
      : "service_unavailable";
  if (safeRpcError(error).rpcCode !== null) return "rpc_response";
  let cause = error;
  let transport = false;
  for (
    let depth = 0;
    depth < 6 && cause && typeof cause === "object";
    depth++
  ) {
    const e = cause as {
      name?: string;
      code?: string;
      status?: number;
      cause?: unknown;
    };
    if (
      e.name === "TimeoutError" ||
      e.name === "AbortError" ||
      e.code === "ETIMEDOUT"
    )
      return "timeout";
    if (e.status === 429 || (typeof e.status === "number" && e.status >= 500))
      return "provider_unavailable";
    if (
      e.name === "HttpRequestError" ||
      e.name === "RpcRequestError" ||
      e.code === "ECONNRESET" ||
      e.code === "ENOTFOUND"
    )
      transport = true;
    cause = e.cause;
  }
  return transport ? "rpc_transport" : fallback;
}

// Never log provider messages, URLs, payloads, cookies or raw exception objects.
export function reportFailure(
  stage: string,
  error: unknown,
  classification?: FailureClass,
  metrics?: {
    attemptCount: number;
    elapsedMs: number;
    httpStatus: number | null;
    correlationId: string;
  },
) {
  console.warn(
    JSON.stringify({
      event: "grindly.request_failure",
      stage,
      requestId: requestContext.getStore() ?? metrics?.correlationId ?? null,
      classification: classification ?? classifyFailure(error),
      ...safeRpcError(error),
      ...(metrics
        ? {
            attemptCount: metrics.attemptCount,
            elapsedMs: metrics.elapsedMs,
            httpStatus:
              validHttpStatus(metrics.httpStatus) ??
              safeRpcError(error).httpStatus,
          }
        : {}),
    }),
  );
}

// One observer per ownership read. It counts real HTTP attempts (including the
// existing viem retries), not inferred retries or unrelated concurrent reads.
export function ownershipDiagnostics() {
  let attemptCount = 0;
  let httpStatus: number | null = null;
  const correlationId = randomUUID();
  let started = performance.now();
  const report = (
    stage: string,
    error: unknown,
    classification?: FailureClass,
  ) =>
    reportFailure(
      stage,
      error,
      classification ?? classifyFailure(error, "rpc_transport"),
      {
        attemptCount,
        elapsedMs: Math.round(performance.now() - started),
        httpStatus,
        correlationId,
      },
    );
  return {
    report,
    onFetchRequest() {
      attemptCount++;
      httpStatus = null;
    },
    onFetchResponse(response: Response) {
      httpStatus = validHttpStatus(response.status);
    },
    async step<T>(stage: string, run: () => Promise<T>): Promise<T> {
      attemptCount = 0;
      httpStatus = null;
      started = performance.now();
      try {
        return await run();
      } catch (error) {
        report(stage, error);
        throw error;
      }
    },
  };
}

export async function withRequestDiagnostics(run: () => Promise<Response>) {
  const id = randomUUID();
  return requestContext.run(id, async () => {
    const response = await run();
    response.headers.set("X-Request-ID", id);
    return response;
  });
}
