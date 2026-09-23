import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/supabase", () => ({
  createAuthClient: async () => ({
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
  }),
  createDataClient: () => ({ from: mocks.from }),
}));

import { getCurrentMember, requireMember } from "@/server/auth/session";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
});

it("derives member identity only from a server-verified auth user", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "forged-cookie-user" } } },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "verified-user", email_confirmed_at: "2026-09-23" } },
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({
    data: {
      id: "member-id",
      auth_user_id: "verified-user",
      email: "invited@example.test",
    },
    error: null,
  });
  expect((await requireMember()).id).toBe("member-id");
  expect(mocks.eq).toHaveBeenCalledWith("auth_user_id", "verified-user");
  expect(mocks.getSession).not.toHaveBeenCalled();
});

it("does not turn authentication alone into a member record", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "uninvited", email_confirmed_at: "2026-09-23" } },
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(requireMember()).rejects.toMatchObject({
    code: "AUTH_REQUIRED",
    status: 401,
  });
});

it("does not read member data for an unconfirmed email", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "unconfirmed", email_confirmed_at: null } },
    error: null,
  });
  expect(await getCurrentMember()).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
});

it("treats a missing session as anonymous", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: { name: "AuthSessionMissingError" },
  });
  expect(await getCurrentMember()).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
});

it("makes auth outages retryable rather than trusting cached identity", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: { status: 503 },
  });
  await expect(getCurrentMember()).rejects.toMatchObject({
    code: "AUTH_UNAVAILABLE",
    retryable: true,
  });
});
