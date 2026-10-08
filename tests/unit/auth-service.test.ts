import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  cookieSet: vi.fn(),
  signInWithOtp: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.cookieGet,
    delete: mocks.cookieDelete,
    set: mocks.cookieSet,
  }),
}));
vi.mock("@/server/supabase", () => ({
  getAuthEnvironment: () => ({
    GRINDLY_STAGE: "auth",
    APP_URL: "https://grindly.io",
  }),
  createAuthClient: async () => ({
    auth: {
      getUser: mocks.getUser,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
      signInWithOtp: mocks.signInWithOtp,
    },
  }),
  createDataClient: () => ({ rpc: mocks.rpc }),
}));

import { verifyOtp, requestOtp } from "@/server/auth/service";
import { hashInvitation } from "@/server/auth/input";

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
  mocks.signInWithOtp.mockResolvedValue({ error: null });
});

it("sends demo email OTP after reserving the shared code and records a demo intent", async () => {
  await requestOtp({
    mode: "demo",
    email: "visitor@example.test",
    invitation: "grindly-example",
  });
  expect(mocks.rpc).toHaveBeenCalledWith("reserve_demo_otp", {
    p_token_hash: hashInvitation("GRINDLY-EXAMPLE"),
    p_email: "visitor@example.test",
  });
  expect(mocks.signInWithOtp).toHaveBeenCalledWith({
    email: "visitor@example.test",
    options: { shouldCreateUser: true },
  });
  expect(JSON.parse(mocks.cookieSet.mock.calls[0]![1])).toMatchObject({
    demo: true,
    email: "visitor@example.test",
  });
});

it("does not send email when a demo code is invalid or throttled", async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  await expect(
    requestOtp({
      mode: "demo",
      email: "visitor@example.test",
      invitation: "GRINDLY-INVALID",
    }),
  ).rejects.toMatchObject({ code: "INVITATION_UNAVAILABLE" });
  expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  expect(mocks.cookieSet).not.toHaveBeenCalled();
});

it("redeems for the freshly verified session identity", async () => {
  await verifyOtp("123456");
  expect(mocks.rpc).toHaveBeenCalledWith("redeem_invitation", {
    p_token_hash: "a".repeat(64),
    p_auth_user_id: "server-verified-user",
  });
  expect(mocks.cookieDelete).toHaveBeenCalledWith("grindly-otp-intent");
});

it("redeems demo access only for the freshly verified identity and stored intent", async () => {
  mocks.cookieGet.mockReturnValue({
    value: JSON.stringify({
      email: "invited@example.test",
      invitationHash: "a".repeat(64),
      demo: true,
    }),
  });
  await verifyOtp("123456");
  expect(mocks.rpc).toHaveBeenCalledWith("redeem_demo", {
    p_token_hash: "a".repeat(64),
    p_auth_user_id: "server-verified-user",
  });
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
