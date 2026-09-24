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
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "wallet_proof_clock" ? new Date().toISOString() : null,
    error: null,
  }));
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
  expect(mocks.rpc).not.toHaveBeenCalledWith(
    "bind_verified_wallet",
    expect.anything(),
  );
});
it("rejects a challenge outside the member's scope", async () => {
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(bindWallet(member, "0x")).rejects.toMatchObject({ status: 403 });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("reports the atomic rate limit without exposing database errors", async () => {
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "wallet_proof_clock"
      ? { data: new Date().toISOString(), error: null }
      : { error: { message: "Challenge rate limit" } },
  );
  await expect(issueChallenge(account.address)).rejects.toMatchObject({
    status: 429,
    retryable: true,
  });
});

it("uses database time even when the application clock is ahead", async () => {
  const databaseTime = new Date(Date.now() - 60_000).toISOString();
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "wallet_proof_clock" ? databaseTime : null,
    error: null,
  }));
  await issueChallenge(account.address);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "issue_wallet_challenge",
    expect.objectContaining({
      p_created_at: databaseTime,
      p_expires_at: new Date(Date.parse(databaseTime) + 300_000).toISOString(),
    }),
  );
});

it("verifies against database time when the application clock is behind", async () => {
  const databaseTime = new Date(Date.now() + 60_000);
  const challenge = createChallenge(
    member,
    account.address,
    "https://grindly.example",
    databaseTime,
  );
  mocks.read.mockResolvedValue({ data: challenge, error: null });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "wallet_proof_clock" ? databaseTime.toISOString() : null,
    error: null,
  }));
  await expect(
    bindWallet(
      challenge.id,
      await account.signMessage({ message: challenge.message }),
    ),
  ).resolves.toEqual({ address: account.address.toLowerCase() });
});

it("fails closed if authoritative time is unavailable", async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: "Unavailable" },
  });
  await expect(issueChallenge(account.address)).rejects.toMatchObject({
    code: "WALLET_CLOCK_UNAVAILABLE",
    retryable: true,
  });
  expect(mocks.rpc).not.toHaveBeenCalledWith(
    "issue_wallet_challenge",
    expect.anything(),
  );
});

it("rejects database-expired proof even if the application clock says it is fresh", async () => {
  const challenge = createChallenge(
    member,
    account.address,
    "https://grindly.example",
  );
  mocks.read.mockResolvedValue({ data: challenge, error: null });
  mocks.rpc.mockResolvedValue({
    data: new Date(Date.now() + 360_000).toISOString(),
    error: null,
  });
  await expect(
    bindWallet(
      challenge.id,
      await account.signMessage({ message: challenge.message }),
    ),
  ).rejects.toMatchObject({ code: "INVALID_WALLET_PROOF" });
  expect(mocks.rpc).not.toHaveBeenCalledWith(
    "bind_verified_wallet",
    expect.anything(),
  );
});
