import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  block: vi.fn(),
  chain: vi.fn(),
}));
vi.mock("server-only", () => ({}));
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
beforeEach(() => {
  vi.resetAllMocks();
  mocks.chain.mockResolvedValue(46630);
  mocks.block.mockResolvedValue({ number: 100n, hash: `0x${"a".repeat(64)}` });
  mocks.read
    .mockResolvedValueOnce(`0x${"b".repeat(40)}`)
    .mockResolvedValueOnce(2n);
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
});
it("rejects a reorganization during ownership reads", async () => {
  mocks.block
    .mockResolvedValueOnce({ number: 100n, hash: "a" })
    .mockResolvedValueOnce({ number: 100n, hash: "b" });
  await expect(readOwnership(1n)).rejects.toMatchObject({
    status: 503,
    retryable: true,
  });
});
