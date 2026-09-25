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
      await expect(page.getByRole("navigation")).toBeHidden();
      await toggle.click();
      await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(
        6,
      );
      await page.getByRole("button", { name: "Close navigation" }).click();
    } else {
      await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(
        6,
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

test("root redirects into the six-screen journey", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/join$/);
});

test("public sample is explicitly illustrative", async ({ page }) => {
  await page.goto("/join");
  await expect(
    page.getByText("Public example, illustrative only"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribute where you have an edge. Get help where you don't.",
    }),
  ).toBeVisible();
});
