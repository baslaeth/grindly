import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  send: vi.fn(),
  set: vi.fn(),
  db: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("@/server/supabase", () => ({
  getAuthEnvironment: () => ({ APP_URL: "https://grindly.test" }),
  createDataClient: mocks.db,
  createAuthClient: async () => ({ auth: { signInWithOtp: mocks.send } }),
}));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({ APP_URL: "https://grindly.test" }),
}));
import { POST } from "@/app/api/auth/otp/route";
beforeEach(() => vi.resetAllMocks());
it.each([null, { status: 429 }, { status: 500 }, { status: 400 }])(
  "returns indistinguishable public results before delivery outcome %j",
  async (error) => {
    const responses = [];
    for (const email of ["member@example.test", "nonmember@example.test"]) {
      mocks.send.mockResolvedValue({ error });
      const response = await POST(
        new Request("https://grindly.test/api/auth/otp", {
          method: "POST",
          headers: {
            Origin: "https://grindly.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: "returning", email }),
        }),
      );
      responses.push({
        status: response.status,
        body: await response.json(),
        headers: [...response.headers],
      });
    }
    expect(responses[0]).toEqual(responses[1]);
    expect(responses[0]!.status).toBe(200);
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    for (const [callback] of mocks.after.mock.calls) await callback();
    expect(mocks.send.mock.calls.map(([input]) => input.options)).toEqual([
      { shouldCreateUser: false },
      { shouldCreateUser: false },
    ]);
    expect(mocks.set.mock.calls[0]![2]).toEqual(mocks.set.mock.calls[1]![2]);
  },
);
it("network failures and arbitrarily slow delivery cannot delay the public response", async () => {
  mocks.send.mockImplementation(() => new Promise(() => {}));
  const response = await POST(
    new Request("https://grindly.test/api/auth/otp", {
      method: "POST",
      headers: {
        Origin: "https://grindly.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: "returning", email: "member@example.test" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.send.mockRejectedValue(new Error("network"));
  await expect(mocks.after.mock.calls[0]![0]()).resolves.toBeUndefined();
});
