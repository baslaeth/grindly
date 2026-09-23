import { expect, test } from "@playwright/test";

test("unconfigured authentication fails closed", async ({ request }) => {
  const response = await request.post("/api/auth/otp", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {
      mode: "join",
      email: "invited@example.test",
      invitation: "a".repeat(64),
    },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({
    error: { code: "AUTH_UNAVAILABLE", retryable: true },
  });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("cross-site authentication mutations are rejected", async ({
  request,
}) => {
  for (const route of ["otp", "verify", "signout"]) {
    const response = await request.post(`/api/auth/${route}`, {
      headers: { Origin: "https://attacker.test" },
      data: {},
    });
    expect(response.status()).toBe(403);
  }
});

test("missing origin cannot bypass the authentication boundary", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/auth/verify", { data: { code: "123456" } })
    ).status(),
  ).toBe(403);
});

test("browser membership flags do not reveal research", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "member_id", value: "forged", url: "http://127.0.0.1:3100" },
    { name: "isMember", value: "true", url: "http://127.0.0.1:3100" },
  ]);
  await page.goto("/workbench");
  await expect(
    page.getByRole("heading", { name: "Active membership required" }),
  ).toBeVisible();
});
