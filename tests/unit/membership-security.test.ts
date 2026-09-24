import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  owned: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireMember: mocks.member }));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({ APP_URL: "http://localhost:3000" }),
}));
vi.mock("@/server/membership/chain", () => ({
  membershipChain: () => ({ address: "contract" }),
  readOwnership: mocks.owned,
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ from: mocks.from }),
}));
import { POST } from "@/app/api/membership/check/route";
import { tokenTier } from "@/server/membership/metadata";
import { ServiceError } from "@/server/errors";

type Row = Record<string, unknown>;
type Table =
  | "membership_bindings"
  | "wallet_bindings"
  | "promotion_decisions"
  | "member_roles";
let tables: Record<Table, Row[]>;
const owned = {
  owner: "alice-wallet",
  epoch: "1",
  block: "10",
  blockHash: "0x1234" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.member.mockResolvedValue({ id: "alice" });
  mocks.owned.mockResolvedValue(owned);
  mocks.insert.mockResolvedValue({ error: null });
  tables = {
    membership_bindings: [
      {
        id: "a1",
        member_id: "alice",
        wallet_binding_id: "aw",
        contract_address: "contract",
        token_id: "1",
        ownership_epoch: "1",
        revoked_at: null,
      },
    ],
    wallet_bindings: [
      {
        id: "aw",
        member_id: "alice",
        address: "alice-wallet",
        revoked_at: null,
      },
    ],
    promotion_decisions: [
      {
        membership_binding_id: "a1",
        member_id: "alice",
        contract_address: "contract",
        token_id: "1",
        ownership_epoch: "1",
        approved_by: "steward",
        revoked_at: null,
      },
    ],
    member_roles: [{ member_id: "steward", role: "steward" }],
  };
  // Honor every query predicate so stale member/token/epoch tests can detect
  // missing server-side filters instead of returning a canned promotion.
  mocks.from.mockImplementation((table: string) => {
    let rows = tables[table as Table] ?? [];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        rows = rows.filter((r) => r[key] === value);
        return query;
      },
      is: (key: string, value: unknown) => {
        rows = rows.filter((r) => r[key] === value);
        return query;
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      insert: mocks.insert,
    };
    return query;
  });
});
const request = (origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/membership/check", {
    method: "POST",
    headers: { Origin: origin },
    body: JSON.stringify({ memberId: "attacker", tokenId: "999" }),
  });

it("protected mutation records only the session-derived member and binding", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.insert).toHaveBeenCalledWith({
    actor_member_id: "alice",
    event_type: "membership.protected_check",
    subject_id: "a1",
  });
});
it.each([
  { owner: "bob-wallet", epoch: "2" },
  { owner: "alice-wallet", epoch: "3" },
])(
  "protected mutation denies stale ownership $owner/$epoch without writing",
  async (state) => {
    mocks.owned.mockResolvedValue({ ...owned, ...state });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  },
);
it("cannot use another member's active binding", async () => {
  mocks.member.mockResolvedValue({ id: "bob" });
  expect((await POST(request())).status).toBe(403);
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("protected mutation rejects cross-origin requests before identity lookup", async () => {
  expect((await POST(request("https://attacker.example"))).status).toBe(403);
  expect(mocks.member).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("protected mutation fails retryably on RPC errors without an audit write", async () => {
  mocks.owned.mockRejectedValue(
    new ServiceError("CHAIN_UNAVAILABLE", "Retry", 503, true),
  );
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error.retryable).toBe(true);
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("does not report a successful action when audit persistence fails", async () => {
  mocks.insert.mockResolvedValue({ error: new Error("database failure") });
  expect((await POST(request())).status).toBe(503);
});
it("a matching steward-approved promotion is Silver", async () => {
  expect(await tokenTier("1", owned)).toBe("Silver");
});
it.each([
  ["member_id", "bob"],
  ["membership_binding_id", "old-binding"],
  ["contract_address", "other-contract"],
  ["token_id", "2"],
  ["ownership_epoch", "0"],
  ["revoked_at", "yesterday"],
])("ignores a promotion with stale or mismatched %s", async (key, value) => {
  tables.promotion_decisions[0]![key] = value;
  expect(await tokenTier("1", owned)).toBe("Bronze");
});
it("transfer-back does not revive an old promotion after fresh binding", async () => {
  tables.membership_bindings[0] = {
    ...tables.membership_bindings[0],
    id: "a3",
    ownership_epoch: "3",
  };
  expect(await tokenTier("1", { ...owned, epoch: "3" })).toBe("Bronze");
});
it("a recipient cannot inherit the sender's promotion", async () => {
  tables.membership_bindings[0] = {
    ...tables.membership_bindings[0],
    id: "b2",
    member_id: "bob",
    wallet_binding_id: "bw",
    ownership_epoch: "2",
  };
  tables.wallet_bindings.push({
    id: "bw",
    member_id: "bob",
    address: "bob-wallet",
    revoked_at: null,
  });
  expect(
    await tokenTier("1", { ...owned, owner: "bob-wallet", epoch: "2" }),
  ).toBe("Bronze");
});
