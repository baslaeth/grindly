import { expect, test } from "@playwright/test";
import { screens } from "../../src/config/screens";

for (const screen of screens) {
  test(`${screen.title} renders without overflow or browser errors`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(screen.href);
    await expect(
      page.getByRole("heading", { name: screen.title, exact: true }),
    ).toBeVisible();
    const toggle = page.getByRole("button", { name: "Open navigation" });
    if (await toggle.isVisible()) {
      expect(
        (await page.locator(".sidebar").boundingBox())!.height,
      ).toBeLessThan(90);
      await expect(page.getByRole("navigation")).toBeHidden();
      await toggle.click();
      await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(
        4,
      );
      await page.getByRole("button", { name: "Close navigation" }).click();
    } else {
      await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(
        4,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("screen.png"),
      fullPage: true,
    });
  });
}

test("Home is the public entry with protected community links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter Hub" })).toHaveCount(0);
  await expect(
    page.locator(".topbar").getByRole("link", { name: "My profile" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Review Desk" })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Explore sample opportunities" })
    .click();
  await expect(
    page.getByText("Separate sample experience.", { exact: false }),
  ).toBeVisible();
});

test("public sample is explicitly illustrative", async ({ page }) => {
  await page.goto("/join");
  await expect(
    page.getByText("Illustrative scenario: fictional people and outcomes"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribute where you have an edge. Get help where you don't.",
    }),
  ).toBeVisible();
});
