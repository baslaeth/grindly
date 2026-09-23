import { z } from "zod";
import { ServiceError } from "./errors";

export function assertSameOrigin(request: Request, appUrl: string) {
  if (request.headers.get("origin") !== new URL(appUrl).origin) {
    throw new ServiceError(
      "INVALID_ORIGIN",
      "Request origin is not allowed.",
      403,
    );
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>) {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  ) {
    throw new ServiceError(
      "INVALID_CONTENT_TYPE",
      "Expected a JSON request.",
      415,
    );
  }
  if (!request.body)
    throw new ServiceError("INVALID_INPUT", "Missing request body.");
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new ServiceError("INPUT_TOO_LARGE", "Request is too large.", 413);
      }
      chunks.push(chunk.value);
    }
    const result = schema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!result.success)
      throw new ServiceError("INVALID_INPUT", "Check the submitted details.");
    return result.data;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("INVALID_INPUT", "Check the submitted details.");
  } finally {
    reader.releaseLock();
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      },
      error.status,
    );
  }
  // External service errors may contain credentials or personal information.
  return jsonResponse(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service temporarily unavailable. Please retry.",
        retryable: true,
      },
    },
    503,
  );
}
