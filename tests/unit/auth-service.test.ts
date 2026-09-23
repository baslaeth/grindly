import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet, delete: mocks.cookieDelete }),
}));
vi.mock("@/server/supabase", () => ({
  getAuthEnvironment: () => ({ GRINDLY_STAGE: "auth" }),
  createAuthClient: async () => ({
    auth: {
      getUser: mocks.getUser,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
    },
  }),
  createDataClient: () => ({ rpc: mocks.rpc }),
}));

import { verifyOtp } from "@/server/auth/service";

it("returns a retryable error when OTP verification is unavailable", async () => {
  mocks.verifyOtp.mockResolvedValue({
    data: { user: null },
    error: { status: 503 },
  });
  await expect(verifyOtp("123456")).rejects.toMatchObject({
    code: "AUTH_UNAVAILABLE",
    retryable: true,
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookieGet.mockReturnValue({
    value: JSON.stringify({
      email: "invited@example.test",
      invitationHash: "a".repeat(64),
    }),
  });
  mocks.verifyOtp.mockResolvedValue({
    data: { user: { id: "initial-response-user" } },
    error: null,
  });
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "server-verified-user",
        email: "invited@example.test",
        email_confirmed_at: "2026-09-23",
      },
    },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: "member-id", error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

it("redeems for the freshly verified session identity", async () => {
  await verifyOtp("123456");
  expect(mocks.rpc).toHaveBeenCalledWith("redeem_invitation", {
    p_token_hash: "a".repeat(64),
    p_auth_user_id: "server-verified-user",
  });
  expect(mocks.cookieDelete).toHaveBeenCalledWith("grindly-otp-intent");
});

it("rejects a changed email and clears the newly authenticated session", async () => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "other-user",
        email: "other@example.test",
        email_confirmed_at: "2026-09-23",
      },
    },
    error: null,
  });
  await expect(verifyOtp("123456")).rejects.toMatchObject({
    code: "AUTH_REQUIRED",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("clears the session when invitation redemption fails", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001" } });
  await expect(verifyOtp("123456")).rejects.toMatchObject({
    code: "INVITATION_UNAVAILABLE",
    status: 403,
  });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("does not redeem after a wrong or expired OTP", async () => {
  mocks.verifyOtp.mockResolvedValue({
    data: { user: null },
    error: { status: 403 },
  });
  await expect(verifyOtp("654321")).rejects.toMatchObject({
    code: "INVALID_OTP",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("rejects missing and malformed sign-in intent cookies", async () => {
  for (const value of [undefined, { value: "not-json" }]) {
    mocks.cookieGet.mockReturnValue(value);
    await expect(verifyOtp("123456")).rejects.toMatchObject({
      code: "OTP_EXPIRED",
    });
  }
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
});
