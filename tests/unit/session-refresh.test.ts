import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  serverClient: vi.fn(),
  dataClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.serverClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.dataClient }));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({
    GRINDLY_STAGE: "membership",
    APP_URL: "https://grindly.test",
    SUPABASE_URL: "https://db.test",
    SUPABASE_PUBLISHABLE_KEY: "test-public",
    SUPABASE_SECRET_KEY: "test-secret",
  }),
}));
vi.mock("@/server/membership/chain", () => ({
  membershipChain: () => ({ address: "contract" }),
  readOwnership: async () => ({ owner: "wallet", epoch: "1" }),
}));
import { POST } from "@/app/api/membership/check/route";
import { getCurrentMember } from "@/server/auth/session";
let browserCookies: Map<string, string>;
let responseCookies: Map<string, string>;
let refreshUsed: boolean;
beforeEach(() => {
  vi.resetAllMocks();
  browserCookies = new Map([
    ["session.0", "expired"],
    ["session.1", "old-refresh"],
  ]);
  responseCookies = new Map();
  refreshUsed = false;
  mocks.cookies.mockImplementation(async () => ({
    getAll: () => [...browserCookies].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => responseCookies.set(name, value),
  }));
  mocks.serverClient.mockImplementation((_url, _key, options) => ({
    auth: {
      getUser: async () => {
        const values = new Map(
          options.cookies
            .getAll()
            .map((c: { name: string; value: string }) => [c.name, c.value]),
        );
        if (values.get("session.0") === "expired") {
          if (refreshUsed)
            return { data: { user: null }, error: { status: 401 } };
          refreshUsed = true;
          options.cookies.setAll([
            {
              name: "session.0",
              value: "fresh-access",
              options: { httpOnly: true },
            },
            {
              name: "session.1",
              value: "rotated-refresh",
              options: { httpOnly: true },
            },
          ]);
        }
        return {
          data: { user: { id: "auth-user", email_confirmed_at: "2026-09-25" } },
          error: null,
        };
      },
    },
  }));
  mocks.dataClient.mockImplementation(() => ({
    from: (table: string) => {
      const rows: Record<string, unknown> = {
        members: { id: "member" },
        membership_bindings: {
          id: "binding",
          member_id: "member",
          wallet_binding_id: "wallet-id",
          token_id: "1",
          ownership_epoch: "1",
        },
        wallet_bindings: { address: "wallet" },
      };
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        maybeSingle: async () => ({ data: rows[table], error: null }),
        insert: async () => ({ error: null }),
      };
      return query;
    },
  }));
});
it("protected route persists rotated cookie chunks for the next protected request", async () => {
  const request = () =>
    new Request("https://grindly.test/api/membership/check", {
      method: "POST",
      headers: { Origin: "https://grindly.test" },
    });
  expect((await POST(request())).status).toBe(200);
  expect([...responseCookies]).toEqual([
    ["session.0", "fresh-access"],
    ["session.1", "rotated-refresh"],
  ]);
  browserCookies = new Map(responseCookies);
  responseCookies.clear();
  expect((await POST(request())).status).toBe(200);
  expect(responseCookies.size).toBe(0);
});
it("Server Component reads do not attempt writes to a read-only cookie store", async () => {
  await getCurrentMember();
  expect(responseCookies.size).toBe(0);
});
