import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  classifyFailure,
  reportFailure,
  withRequestDiagnostics,
} from "@/server/diagnostics";
afterEach(() => vi.restoreAllMocks());
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
it("classifies wrapped timeout failures without reading exception messages", () => {
  expect(
    classifyFailure({
      name: "ContractFunctionExecutionError",
      cause: { name: "TimeoutError" },
    }),
  ).toBe("timeout");
});
