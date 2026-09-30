import { test, expect } from "@playwright/test";

test("public intelligence introduction never exposes an alpha selector or sources", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore Grind Intelligence", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Grind Intelligence", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("AI analysis is not connected yet.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Membership required" }),
  ).toBeVisible();
  await expect(page.getByLabel("Select an alpha")).toHaveCount(0);
  await expect(page.locator(".source-list")).toHaveCount(0);
});
