import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  assignment: vi.fn(),
  context: vi.fn(),
  sources: vi.fn(),
  model: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/alpha/sources", () => ({ collectSources: mocks.sources }));
vi.mock("@/server/alpha/provider", () => ({ modelReview: mocks.model }));
vi.mock("@/server/membership/research-access", () => ({
  requireResearchMembership: mocks.access,
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle:
          table === "review_assignments" ? mocks.assignment : mocks.context,
      };
      return q;
    },
  }),
}));
import { preparePreliminary, executePreliminary } from "@/server/alpha/service";
import type { ReviewContext } from "@/alpha/checks";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({
    member: { id: "actor" },
    binding: { id: "binding" },
  });
  mocks.assignment.mockResolvedValue({
    data: { scope: "evidence" },
    error: null,
  });
  mocks.context.mockResolvedValue({ data: null, error: null });
});
it("source refresh persists checks without invoking a model or award code", async () => {
  const context = {
    existing: false,
    run: "run",
    isDemo: true,
    candidates: [],
    messages: [],
    version: {
      submitted_at: "2026-09-30T00:00:00Z",
      claim: "Observed statement",
    },
    alpha: {
      category: "Project Analysts",
      contribution_type: "analysis",
      details: {},
      evidence: [],
      contract: "",
    },
  } as unknown as ReviewContext;
  mocks.sources.mockResolvedValue([
    { id: "source", status: "unknown", label: "Unavailable source" },
  ]);
  mocks.rpc.mockResolvedValue({ error: null });
  await executePreliminary(context);
  expect(mocks.model).not.toHaveBeenCalled();
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "alpha_finish_sources",
  ]);
  expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({
    p_status: "complete",
    p_hints: [],
  });
});

it("public demo access cannot start fresh local inference", async () => {
  mocks.access.mockResolvedValue({
    member: { id: "visitor" },
    binding: { id: "demo" },
    demo: true,
  });
  await expect(preparePreliminary("version", true)).rejects.toMatchObject({
    code: "AI_UNAVAILABLE",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.model).not.toHaveBeenCalled();
});
it("a source exception records a failed refresh without losing or evaluating the submitted record", async () => {
  mocks.sources.mockRejectedValue(new Error("private upstream error"));
  mocks.rpc.mockResolvedValue({ error: null });
  await executePreliminary({
    existing: false,
    run: "run",
    candidates: [],
    version: { claim: "Saved claim", submitted_at: "2026-09-30T00:00:00Z" },
    alpha: {
      category: "Traders",
      contribution_type: "analysis",
      details: {},
      evidence: [],
      contract: "",
    },
  } as unknown as ReviewContext);
  expect(mocks.model).not.toHaveBeenCalled();
  expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({ p_status: "failed" });
  expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(
    "private upstream",
  );
});
it("rechecks current reviewer authority before starting a preliminary operation", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: { author_id: "author" }, error: null })
    .mockResolvedValueOnce({ data: false, error: null });
  await expect(preparePreliminary("version")).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "alpha_version_guard",
    "alpha_authorized_reviewer",
  ]);
});
it("an author may start a review only after the live membership and version gates", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: { author_id: "actor" }, error: null })
    .mockResolvedValueOnce({ data: { run: "operation" }, error: null });
  expect(await preparePreliminary("version")).toMatchObject({
    run: "operation",
    launchContext: {},
  });
  expect(mocks.access).toHaveBeenCalledWith(true);
  expect(mocks.assignment).not.toHaveBeenCalled();
  expect(mocks.context).toHaveBeenCalledTimes(2);
});
it("failed ownership never reads private review context", async () => {
  mocks.access.mockRejectedValue(new Error("Ownership unavailable"));
  await expect(preparePreliminary("version")).rejects.toThrow(
    "Ownership unavailable",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("an unassigned peer cannot request paid model processing", async () => {
  mocks.rpc.mockResolvedValueOnce({
    data: { author_id: "author" },
    error: null,
  });
  mocks.assignment.mockResolvedValue({ data: null, error: null });
  await expect(preparePreliminary("version")).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
