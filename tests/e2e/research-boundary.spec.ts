import { expect, test } from "@playwright/test";
test("all research screens and APIs preserve the membership boundary", async ({
  page,
  request,
}) => {
  for (const path of [
    "/workbench",
    "/findings/new",
    "/findings/latest",
    "/review",
    "/membership",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Active membership required" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit for review", exact: true }),
    ).toHaveCount(0);
  }
  const read = await request.get("/api/research");
  expect(read.status()).toBe(503);
  expect(read.headers()["cache-control"]).toBe("no-store");
  expect(JSON.stringify(await read.json())).not.toContain("testnet-readiness");
  const write = await request.post("/api/research", {
    headers: { Origin: "https://attacker.example" },
    data: { action: "profile", name: "test", specialty: "risk" },
  });
  expect(write.status()).toBe(403);
});
test("public illustration is distinct from real people, credit and reward promises", async ({
  page,
}) => {
  await page.goto("/join");
  await expect(
    page.getByText("Illustrative scenario: fictional people and outcomes"),
  ).toBeVisible();
  await expect(page.getByText(/These examples earn no real XP/)).toBeVisible();
  await expect(
    page.getByText("No eligibility, airdrop or compensation guarantee."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
