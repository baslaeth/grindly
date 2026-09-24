import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  mint: vi.fn(),
  from: vi.fn(),
  statuses: vi.fn(),
  incomplete: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ from: mocks.from }),
}));
vi.mock("@/server/membership/issuance", () => ({ mintMembership: mocks.mint }));
import { reconcileMints } from "@/server/membership/reconciliation";
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: () => query,
    in: mocks.statuses,
    is: mocks.incomplete,
    order: async () => ({
      data: [
        { id: "confirmed-unbound", member_id: "a" },
        { id: "pending", member_id: "b" },
      ],
      error: null,
    }),
  };
  mocks.from.mockReturnValue(query);
  mocks.statuses.mockReturnValue(query);
  mocks.incomplete.mockReturnValue(query);
});
it("includes confirmed-but-unbound operations and excludes durable binding completions", async () => {
  mocks.mint.mockResolvedValue({ status: "confirmed" });
  expect(await reconcileMints()).toHaveLength(2);
  expect(mocks.statuses).toHaveBeenCalledWith("status", [
    "created",
    "signed",
    "broadcast",
    "confirmed",
  ]);
  expect(mocks.incomplete).toHaveBeenCalledWith("binding_completed_at", null);
  expect(mocks.mint.mock.calls).toEqual([["a"], ["b"]]);
});
it("continues past interrupted operations and reports reverted results without retrying them", async () => {
  mocks.mint
    .mockRejectedValueOnce(new Error("interrupted"))
    .mockResolvedValueOnce({ status: "reverted" });
  expect(await reconcileMints()).toEqual([
    { operationId: "confirmed-unbound", status: "retry-required" },
    { operationId: "pending", status: "reverted" },
  ]);
});
