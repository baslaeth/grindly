import { expect, test } from "@playwright/test";

test("wallet mutations reject cross-origin and identity injection", async ({
  request,
}) => {
  for (const path of ["challenge", "verify"]) {
    const response = await request.post(`/api/wallet/${path}`, {
      headers: { Origin: "https://attacker.example" },
      data: {},
    });
    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toBe("no-store");
  }
  const forged = await request.post("/api/wallet/challenge", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {
      address: `0x${"a".repeat(40)}`,
      chainId: 46630,
      memberId: "forged",
    },
  });
  expect(forged.status()).toBe(400);
});

test("wallet proof cannot bypass unavailable authentication", async ({
  request,
}) => {
  const response = await request.post("/api/wallet/challenge", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { address: `0x${"a".repeat(40)}`, chainId: 46630 },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({
    error: { code: "AUTH_UNAVAILABLE" },
  });
});
