import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  owned: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireMember: mocks.member }));
vi.mock("@/server/membership/chain", () => ({
  membershipChain: () => ({ address: "contract" }),
  readOwnership: mocks.owned,
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
import { requireActiveMembership } from "@/server/membership/access";
import { tokenTier } from "@/server/membership/metadata";
import { GET } from "@/app/api/metadata/46630/[tokenId]/route";

const tables: Record<string, unknown> = {};
const ownership = {
  owner: "wallet",
  epoch: "1",
  block: "10",
  blockHash: "0x1234" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.member.mockResolvedValue({ id: "member" });
  mocks.owned.mockResolvedValue(ownership);
  Object.assign(tables, {
    membership_bindings: {
      id: "binding",
      member_id: "member",
      wallet_binding_id: "walletId",
      token_id: "1",
      ownership_epoch: "1",
      contract_address: "contract",
    },
    wallet_bindings: { address: "wallet" },
    promotion_decisions: null,
    member_roles: null,
  });
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: tables[table], error: null })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    return query;
  });
});
it("allows the bound current owner at the recorded epoch", async () => {
  expect((await requireActiveMembership()).member.id).toBe("member");
});
it("denies a former owner immediately after transfer", async () => {
  mocks.owned.mockResolvedValue({
    ...ownership,
    owner: "recipient",
    epoch: "2",
  });
  await expect(requireActiveMembership()).rejects.toMatchObject({
    status: 403,
  });
});
it("denies a transfer-away-and-back with stale epoch", async () => {
  mocks.owned.mockResolvedValue({ ...ownership, epoch: "3" });
  await expect(requireActiveMembership()).rejects.toMatchObject({
    status: 403,
  });
});
it("denies a missing or revoked binding", async () => {
  tables.membership_bindings = null;
  await expect(requireActiveMembership()).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.owned).not.toHaveBeenCalled();
});
it("propagates retryable RPC failure without trusting stored membership", async () => {
  mocks.owned.mockRejectedValue({ status: 503, retryable: true });
  await expect(requireActiveMembership()).rejects.toMatchObject({
    status: 503,
    retryable: true,
  });
});
it("returns Bronze without an approved promotion", async () => {
  expect(await tokenTier("1", ownership)).toBe("Bronze");
});
it("requires a current steward and current token owner for Silver", async () => {
  tables.promotion_decisions = { approved_by: "steward" };
  expect(await tokenTier("1", ownership)).toBe("Bronze");
  tables.member_roles = { member_id: "steward" };
  expect(await tokenTier("1", ownership)).toBe("Silver");
  expect(await tokenTier("1", { ...ownership, owner: "recipient" })).toBe(
    "Bronze",
  );
});
it("does not expose wallet or member identity in metadata", async () => {
  const response = await GET(new Request("https://example.test"), {
    params: Promise.resolve({ tokenId: "1" }),
  });
  expect(await response.json()).toEqual({
    name: "Grindly Membership #1",
    description:
      "Grindly specialist exchange membership on Robinhood Chain testnet.",
    attributes: [
      { trait_type: "Tier", value: "Bronze" },
      { trait_type: "Network", value: "Robinhood Chain testnet" },
    ],
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
