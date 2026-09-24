import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  bind: vi.fn(),
  sign: vi.fn(),
  prepare: vi.fn(),
  receipt: vi.fn(),
  send: vi.fn(),
  head: vi.fn(),
}));
const issuer = `0x${"d".repeat(40)}`;
const contract = `0x${"c".repeat(40)}`;
const recipient = `0x${"a".repeat(40)}`;
const key = `0x${"2".repeat(64)}`;
vi.mock("server-only", () => ({}));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({
    ISSUER_PRIVATE_KEY: "test-only",
    ROBINHOOD_RPC_URL: "https://rpc.test",
  }),
}));
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: () => ({ address: `0x${"d".repeat(40)}` }),
}));
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createWalletClient: () => ({
    prepareTransactionRequest: mocks.prepare,
    signTransaction: mocks.sign,
  }),
  parseEventLogs: () => [
    {
      address: `0x${"c".repeat(40)}`,
      args: {
        issuanceKey: `0x${"2".repeat(64)}`,
        recipient: `0x${"a".repeat(40)}`,
        tokenId: 1n,
      },
    },
  ],
}));
vi.mock("@/server/membership/chain", () => ({
  REQUIRED_CONFIRMATIONS: 2n,
  membershipAbi: [
    {
      type: "function",
      name: "mint",
      stateMutability: "nonpayable",
      inputs: [
        { name: "recipient", type: "address" },
        { name: "issuanceKey", type: "bytes32" },
      ],
      outputs: [{ type: "uint256" }],
    },
  ],
  membershipChain: () => ({
    address: `0x${"c".repeat(40)}`,
    client: {
      getChainId: async () => 46630,
      readContract: async () => `0x${"d".repeat(40)}`,
      getTransactionCount: async () => 7,
      getTransactionReceipt: mocks.receipt,
      getBlockNumber: mocks.head,
      getBlock: async () => ({ hash: "block-hash" }),
      sendRawTransaction: mocks.send,
      getTransaction: async () => null,
    },
  }),
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/server/membership/access", () => ({ bindOwnedToken: mocks.bind }));
import { mintMembership } from "@/server/membership/issuance";
let operation: Record<string, unknown>;
beforeEach(() => {
  vi.resetAllMocks();
  operation = {
    id: "op",
    member_id: "member",
    recipient_address: recipient,
    contract_address: contract,
    issuance_key: key,
    status: "created",
    signed_transaction: null,
    transaction_hash: null,
    binding_completed_at: null,
    token_id: null,
  };
  mocks.rpc.mockImplementation(async (name, args) => {
    if (name === "allocate_mint_nonce") return { data: 7, error: null };
    if (name === "persist_mint_transaction" && !operation.signed_transaction)
      Object.assign(operation, {
        signed_transaction: args.p_signed,
        transaction_hash: args.p_hash,
        status: "signed",
        issuer_address: issuer,
      });
    return { data: "op", error: null };
  });
  mocks.from.mockImplementation(() => {
    let update: Record<string, unknown> | null = null;
    const predicates: Array<(row: Record<string, unknown>) => boolean> = [];
    const query = {
      select: () => query,
      eq: (k: string, v: unknown) => {
        predicates.push((r) => r[k] === v);
        return query;
      },
      in: (k: string, v: unknown[]) => {
        predicates.push((r) => v.includes(r[k]));
        return query;
      },
      update: (values: Record<string, unknown>) => {
        update = values;
        return query;
      },
      single: async () => ({ data: { ...operation }, error: null }),
      then: (resolve: (value: unknown) => unknown) => {
        if (update && predicates.every((p) => p(operation)))
          Object.assign(operation, update);
        return Promise.resolve(resolve({ error: null }));
      },
    };
    return query;
  });
  mocks.prepare.mockResolvedValue({ nonce: 7 });
  mocks.sign.mockResolvedValue("0x1234");
  mocks.receipt.mockResolvedValue({
    status: "success",
    blockNumber: 10n,
    blockHash: "block-hash",
    logs: [],
  });
  mocks.head.mockResolvedValue(11n);
  mocks.bind.mockImplementation(async () => {
    operation.binding_completed_at = "done";
    return { bound: true };
  });
});
it("retries a confirmed operation after interrupted binding without signing again", async () => {
  mocks.bind.mockRejectedValueOnce(new Error("binding interrupted"));
  await expect(mintMembership("member")).rejects.toThrow("binding interrupted");
  expect(operation.status).toBe("confirmed");
  expect(operation.binding_completed_at).toBeNull();
  expect(await mintMembership("member")).toMatchObject({
    status: "confirmed",
    bound: true,
  });
  expect(mocks.sign).toHaveBeenCalledOnce();
  expect(mocks.bind).toHaveBeenCalledTimes(2);
  await mintMembership("member");
  expect(mocks.bind).toHaveBeenCalledTimes(2);
});
it("does not bind insufficiently confirmed or reverted receipts", async () => {
  mocks.head.mockResolvedValue(10n);
  expect(await mintMembership("member")).toMatchObject({ status: "pending" });
  expect(mocks.bind).not.toHaveBeenCalled();
  mocks.head.mockResolvedValue(11n);
  mocks.receipt.mockResolvedValue({
    status: "reverted",
    blockNumber: 10n,
    blockHash: "block-hash",
    logs: [],
  });
  expect(await mintMembership("member")).toMatchObject({ status: "reverted" });
  expect(mocks.bind).not.toHaveBeenCalled();
  await mintMembership("member");
  expect(mocks.sign).toHaveBeenCalledOnce();
});
it("concurrent retries broadcast only the first persisted signed transaction", async () => {
  mocks.sign.mockResolvedValueOnce("0x1234").mockResolvedValueOnce("0x5678");
  mocks.receipt.mockResolvedValue(null);
  const results = await Promise.all([
    mintMembership("member"),
    mintMembership("member"),
  ]);
  expect(results.map((r) => r.status)).toEqual(["pending", "pending"]);
  expect(mocks.send).toHaveBeenCalledTimes(2);
  for (const [args] of mocks.send.mock.calls)
    expect(args.serializedTransaction).toBe(operation.signed_transaction);
  expect(mocks.bind).not.toHaveBeenCalled();
});
