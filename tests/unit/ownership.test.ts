import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  block: vi.fn(),
  chain: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireMember: vi.fn() }));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      maybeSingle: async () => ({
        data: { address: `0x${"b".repeat(40)}` },
        error: null,
      }),
    };
    return { from: () => query, rpc: mocks.rpc };
  },
}));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({
    GRINDLY_STAGE: "membership",
    ROBINHOOD_RPC_URL: "https://rpc.example",
    MEMBERSHIP_CONTRACT_ADDRESS: `0x${"a".repeat(40)}`,
  }),
}));
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => ({
    readContract: mocks.read,
    getBlock: mocks.block,
    getChainId: mocks.chain,
  }),
}));
import { readOwnership } from "@/server/membership/chain";
import { bindOwnedToken } from "@/server/membership/access";
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.chain.mockResolvedValue(46630);
  mocks.block.mockImplementation(async (request) => ({
    number: request.blockNumber ?? 100n,
    hash: `0x${"a".repeat(64)}`,
  }));
  mocks.read
    .mockResolvedValueOnce(`0x${"b".repeat(40)}`)
    .mockResolvedValueOnce(2n);
});
afterEach(() => vi.restoreAllMocks());
it("existing-token binding cannot bypass the two-confirmation mint gate", async () => {
  mocks.read.mockRejectedValueOnce(new Error("ERC721NonexistentToken"));
  await expect(bindOwnedToken("member", "1")).rejects.toMatchObject({
    code: "OWNERSHIP_PENDING",
    retryable: true,
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.block).toHaveBeenCalledWith({ blockNumber: 99n });
});
it("rejects a newly transferred epoch even if the NFT existed earlier", async () => {
  mocks.read
    .mockResolvedValueOnce(`0x${"b".repeat(40)}`)
    .mockResolvedValueOnce(1n);
  await expect(bindOwnedToken("member", "1")).rejects.toMatchObject({
    code: "OWNERSHIP_PENDING",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("binds only when confirmed and latest owner and epoch agree", async () => {
  mocks.read
    .mockResolvedValueOnce(`0x${"b".repeat(40)}`)
    .mockResolvedValueOnce(2n);
  mocks.rpc.mockResolvedValue({ data: "binding", error: null });
  expect(await bindOwnedToken("member", "1")).toMatchObject({
    bound: true,
    epoch: "2",
  });
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.read.mock.calls.map(([request]) => request.blockNumber)).toEqual(
    [100n, 100n, 99n, 99n],
  );
});
it("reads owner and epoch at exactly the same explicit block", async () => {
  const result = await readOwnership(1n);
  expect(result.epoch).toBe("2");
  for (const [request] of mocks.read.mock.calls)
    expect(request.blockNumber).toBe(100n);
  expect(mocks.read.mock.calls.map(([r]) => r.functionName)).toEqual([
    "ownerOf",
    "ownershipEpoch",
  ]);
});
it("fails closed with a retryable error on RPC failure", async () => {
  mocks.block.mockRejectedValue(new Error("timeout"));
  await expect(readOwnership(1n)).rejects.toMatchObject({
    status: 503,
    retryable: true,
  });
});
it("rejects a different chain", async () => {
  mocks.chain.mockResolvedValue(1);
  await expect(readOwnership(1n)).rejects.toMatchObject({ status: 503 });
  expect(mocks.read).not.toHaveBeenCalled();
  expect(JSON.parse(vi.mocked(console.warn).mock.calls[0]![0])).toMatchObject({
    stage: "ownership.network",
    classification: "wrong_network",
  });
});
it("rejects a reorganization during ownership reads", async () => {
  mocks.block
    .mockResolvedValueOnce({ number: 100n, hash: "a" })
    .mockResolvedValueOnce({ number: 100n, hash: "b" });
  await expect(readOwnership(1n)).rejects.toMatchObject({
    status: 503,
    retryable: true,
  });
  expect(JSON.parse(vi.mocked(console.warn).mock.calls[0]![0])).toMatchObject({
    stage: "ownership.consistency",
    classification: "block_consistency",
  });
});
it.each([
  ["TimeoutError", undefined, "timeout"],
  ["HttpRequestError", 503, "provider_unavailable"],
  ["HttpRequestError", 429, "provider_unavailable"],
  ["HttpRequestError", undefined, "rpc_transport"],
])(
  "safely classifies %s/%s without logging provider payloads",
  async (name, status, classification) => {
    mocks.block.mockRejectedValue(
      Object.assign(
        new Error("https://private.rpc/?key=SECRET cookie=SECRET"),
        { name, status },
      ),
    );
    await expect(readOwnership(1n)).rejects.toMatchObject({
      code: "CHAIN_UNAVAILABLE",
      status: 503,
      retryable: true,
    });
    const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logs).not.toContain("SECRET");
    expect(JSON.parse(vi.mocked(console.warn).mock.calls[0]![0])).toMatchObject(
      { stage: "ownership.block", classification },
    );
  },
);
