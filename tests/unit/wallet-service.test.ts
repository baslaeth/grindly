import { beforeEach, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createChallenge } from "@/server/wallet/proof";

const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  read: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireMember: mocks.member }));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({ APP_URL: "https://grindly.example" }),
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
import { bindWallet, issueChallenge } from "@/server/wallet/service";

const member = "11111111-1111-4111-8111-111111111111";
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.member.mockResolvedValue({ id: member });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.read });
  mocks.rpc.mockResolvedValue({ error: null });
});
it("uses server identity when issuing a challenge", async () => {
  await issueChallenge(account.address);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "issue_wallet_challenge",
    expect.objectContaining({
      p_member_id: member,
      p_address: account.address.toLowerCase(),
    }),
  );
});
it("requires authentication before reading or writing wallet data", async () => {
  mocks.member.mockRejectedValue(new Error("Authentication required"));
  await expect(issueChallenge(account.address)).rejects.toThrow();
  await expect(bindWallet(member, "0x")).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
it("scopes challenge lookup to the server member and verifies before binding", async () => {
  const challenge = createChallenge(
    member,
    account.address,
    "https://grindly.example",
  );
  mocks.read.mockResolvedValue({ data: challenge, error: null });
  await bindWallet(
    challenge.id,
    await account.signMessage({ message: challenge.message }),
  );
  expect(mocks.eq).toHaveBeenCalledWith("member_id", member);
  expect(mocks.rpc).toHaveBeenCalledWith("bind_verified_wallet", {
    p_member_id: member,
    p_challenge_id: challenge.id,
    p_message: challenge.message,
  });
});
it("never commits an invalid signature", async () => {
  const challenge = createChallenge(
    member,
    account.address,
    "https://grindly.example",
  );
  mocks.read.mockResolvedValue({ data: challenge, error: null });
  await expect(
    bindWallet(
      challenge.id,
      await account.signMessage({ message: "different" }),
    ),
  ).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects a challenge outside the member's scope", async () => {
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(bindWallet(member, "0x")).rejects.toMatchObject({ status: 403 });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("reports the atomic rate limit without exposing database errors", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "Challenge rate limit" } });
  await expect(issueChallenge(account.address)).rejects.toMatchObject({
    status: 429,
    retryable: true,
  });
});
