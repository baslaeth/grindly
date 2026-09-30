import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";

test("Home and sidebar open permitted saved intelligence, questions and original alpha", async ({
  browser,
  baseURL,
}, info) => {
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
  );
  try {
    const finding = data.findings.find((f) =>
      data.alphas?.some((a) => a.version_id === f.current_version),
    );
    expect(finding, "Existing isolated alpha required").toBeDefined();
    const page = await context.newPage();
    await page.goto("/");
    await page
      .getByRole("link", { name: "Explore Grind Intelligence", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Grind Intelligence", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".topbar").getByRole("link", { name: "My profile" }),
    ).toBeVisible();
    await page.getByLabel("Select an alpha").selectOption(finding!.id);
    await page.getByRole("button", { name: "Open alpha", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Selected alpha" }),
    ).toContainText(
      data.versions.find((v) => v.id === finding!.current_version)!.claim,
    );
    for (const label of [
      "What sources were checked?",
      "What information is missing?",
      "Is there related earlier alpha?",
      "What happened after the declared horizon?",
    ]) {
      const question = page
        .locator("details.intelligence-question")
        .filter({ has: page.locator("summary", { hasText: label }) });
      await question.locator(":scope > summary").click();
      await expect(question).toHaveAttribute("open", "");
      await expect(question.locator("p, li").first()).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const dir = `docs/grind-intelligence/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${dir}/saved-checks.png`, fullPage: true });
    await page
      .getByRole("link", { name: "Open alpha and Review Assistant" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Review Assistant", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Explore in Grind Intelligence" })
      .first()
      .click();
    await expect(page).toHaveURL(`/intelligence?alpha=${finding!.id}`, {
      timeout: 20000,
    });
    await page.reload();
    await expect(page.getByLabel("Select an alpha")).toHaveValue(finding!.id);
    const toggle = page.getByRole("button", { name: "Open navigation" });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await toggle.isVisible()) await toggle.click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const labels = await nav.getByRole("link").allTextContents();
    expect(labels.indexOf("Grind Intelligence")).toBe(
      labels.indexOf("Submit alpha") + 1,
    );
    await page.screenshot({ path: `${dir}/sidebar.png` });
    await nav
      .getByRole("link", { name: "Grind Intelligence", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Grind Intelligence", exact: true }),
    ).toBeVisible();
    await page.goto("/intelligence?alpha=00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "not available",
    );
    await expect(page.getByLabel("Select an alpha")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
