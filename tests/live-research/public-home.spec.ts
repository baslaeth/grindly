import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
test("visitors can inspect fictional public cards without private opportunity data", async ({
  page,
  baseURL,
}, info) => {
  test.skip(
    new URL(baseURL!).hostname !== "localhost",
    "Local executable review only",
  );
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore sample opportunities" })
    .click();
  await expect(page.locator(".opportunity-card")).toHaveCount(3, {
    timeout: 20000,
  });
  await expect(
    page.getByText("Separate sample experience.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator(".opportunity-card").getByRole("button"),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".opportunity-card")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.locator(".topbar").getByRole("link", { name: "My profile" }),
  ).toBeVisible();
  const cards = await page.request.get("/api/opportunities?sample=1");
  expect(cards.ok()).toBe(true);
  expect(await cards.text()).not.toMatch(
    /protected_url|allocation_code|auth_user_id|@example\.test/,
  );
  await mkdir(`docs/member-experience-review/${info.project.name}`, {
    recursive: true,
  });
  await page.screenshot({
    path: `docs/member-experience-review/${info.project.name}/public-home.png`,
    fullPage: true,
  });
});
test("existing isolated operator can persist a nonpublic opportunity draft", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "operations",
  );
  try {
    test.skip(
      !a.data.roles.includes("steward"),
      "No existing isolated steward; do not grant authority for this test",
    );
    const page = await a.context.newPage();
    await page.goto("/");
    await page.getByText("Manage opportunities", { exact: true }).click();
    const form = page.locator(".opportunity-management");
    const name = `Sample operator draft ${Date.now()}`;
    await form.getByLabel("Name", { exact: true }).fill(name);
    await form
      .getByLabel("Description", { exact: true })
      .fill(
        "Isolated operator verification. Not a real campaign and not publicly published.",
      );
    await form.getByLabel("Type", { exact: true }).fill("Sample research");
    await form.getByRole("checkbox", { name: "Bronze", exact: true }).check();
    await form.getByRole("button", { name: "Save opportunity" }).click();
    await expect(
      form.getByText("Opportunity saved.", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await page.reload();
    await page.getByText("Manage opportunities", { exact: true }).click();
    await expect(
      form
        .getByLabel("Opportunity", { exact: true })
        .locator("option")
        .filter({ hasText: name }),
    ).toHaveCount(1, { timeout: 20000 });
    await form
      .getByLabel("Opportunity", { exact: true })
      .selectOption({ label: name });
    await expect(form.getByLabel("Name", { exact: true })).toHaveValue(name);
    await expect(
      form.getByRole("checkbox", { name: "Publish public card" }),
    ).not.toBeChecked();
    await form.getByLabel("Name", { exact: true }).fill(`${name} revised`);
    await form.getByRole("button", { name: "Save opportunity" }).click();
    await expect(
      form.getByText("Opportunity saved.", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const publicCards = await page.request.get("/api/opportunities?sample=1");
    expect(await publicCards.text()).not.toContain(name);
  } finally {
    await a.context.close();
  }
});
