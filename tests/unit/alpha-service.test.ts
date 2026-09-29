import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  assignment: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/membership/access", () => ({
  requireActiveMembership: mocks.access,
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({
    rpc: mocks.rpc,
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle: mocks.assignment,
      };
      return q;
    },
  }),
}));
import { preparePreliminary } from "@/server/alpha/service";
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
  expect(await preparePreliminary("version")).toEqual({ run: "operation" });
  expect(mocks.access).toHaveBeenCalledWith(true);
  expect(mocks.assignment).not.toHaveBeenCalled();
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
