import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { ServiceError } from "./errors";

const requestContext = new AsyncLocalStorage<string>();
export type FailureClass =
  | "wrong_network"
  | "block_consistency"
  | "timeout"
  | "provider_unavailable"
  | "rpc_transport"
  | "access_denied"
  | "service_unavailable";

export function classifyFailure(
  error: unknown,
  fallback: FailureClass = "service_unavailable",
): FailureClass {
  if (error instanceof ServiceError)
    return [401, 403, 404].includes(error.status)
      ? "access_denied"
      : "service_unavailable";
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
) {
  console.warn(
    JSON.stringify({
      event: "grindly.request_failure",
      stage,
      requestId: requestContext.getStore() ?? null,
      classification: classification ?? classifyFailure(error),
    }),
  );
}

export async function withRequestDiagnostics(run: () => Promise<Response>) {
  const id = randomUUID();
  return requestContext.run(id, async () => {
    const response = await run();
    response.headers.set("X-Request-ID", id);
    return response;
  });
}
